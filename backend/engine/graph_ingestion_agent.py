import logging
import os
from typing import Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.graphs import Neo4jGraph
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

class GraphIngestionAgent:
    def __init__(self, neo4j_uri: str, neo4j_user: str, neo4j_password: str):
        self.graph = Neo4jGraph(
            url=neo4j_uri,
            username=neo4j_user,
            password=neo4j_password
        )
        
        # We will use Gemini 3.5 Flash via Google AI API Key for extraction stability
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-3.5-flash",
            temperature=0,
            convert_system_message_to_human=True
        )
        
        # Specifically prompt it to extract SIF related nodes
        allowed_nodes = ["Report", "Equipment", "Hazard", "Location", "Person", "IncidentCause", "EnergySource"]
        allowed_edges = ["INVOLVES_EQUIPMENT", "HAS_HAZARD", "OCCURRED_AT", "INVOLVED_PERSON", "CAUSED_BY", "RELEASED_ENERGY", "RESULTED_IN"]
        
        self.transformer = LLMGraphTransformer(
            llm=self.llm,
            allowed_nodes=allowed_nodes,
            allowed_relationships=allowed_edges,
            node_properties=True
        )

    def ingest_report(self, report_id: str, report_text: str, metadata: Dict[str, Any] = None) -> bool:
        """
        Uses Gemini to extract entities and relationships in a single shot
        and merges them into Neo4j.
        """
        logger.info(f"Agent 1: Extracting Graph Nodes and Edges from report {report_id}...")
        
        # 1. Create a Document object (Assign exact id for Neo4j Document node creation)
        doc = Document(
            page_content=report_text,
            metadata={"id": report_id, "report_id": report_id, **(metadata or {})}
        )
        
        # 2. Extract Graph Documents (Nodes and Relationships)
        try:
            graph_docs = self.transformer.convert_to_graph_documents([doc])
            
            # 3. Add to Neo4j database (This merges nodes and relationships)
            self.graph.add_graph_documents(
                graph_docs,
                baseEntityLabel=True,
                include_source=True
            )
            
            # 4. Transform Document into Report node directly, setting properties
            cypher = """
            MATCH (d:Document {id: $report_id})
            SET d:Report
            SET d += $metadata, d.text = $text, d.ehs_code = $ehs_code
            """
            self.graph.query(
                cypher, 
                params={
                    "report_id": report_id, 
                    "metadata": metadata or {}, 
                    "text": report_text,
                    "ehs_code": metadata.get("ehs_code", "Unknown") if metadata else "Unknown"
                }
            )
            
            logger.info(f"Agent 1: Successfully ingested report {report_id} into Graph DB.")
            return True
        except Exception as e:
            logger.error(f"Agent 1 Failed to ingest report {report_id}: {e}")
            return False

    def ingest_reports_batch(self, reports: list[Dict[str, Any]]) -> bool:
        """
        Batches multiple reports into a single LLM call for extraction to dramatically 
        save on API quota limits. Uses structured output mapping.
        """
        if not reports:
            return True
            
        logger.info(f"Agent 1: Batch extracting graph for {len(reports)} reports...")
        
        try:
            from pydantic import BaseModel, Field
            
            class Node(BaseModel):
                id: str
                label: str = Field(description="One of: Equipment, Hazard, Location, Person, IncidentCause, EnergySource")
                
            class Edge(BaseModel):
                source: str
                target: str
                type: str = Field(description="One of: INVOLVES_EQUIPMENT, HAS_HAZARD, OCCURRED_AT, INVOLVED_PERSON, CAUSED_BY, RELEASED_ENERGY, RESULTED_IN")
                
            class ReportGraph(BaseModel):
                report_id: str
                nodes: list[Node]
                edges: list[Edge]
                
            class BatchGraph(BaseModel):
                graphs: list[ReportGraph]

            prompt_text = "Extract process safety knowledge graphs for the following incident reports.\n"
            prompt_text += "Allowed Node Labels: Equipment, Hazard, Location, Person, IncidentCause, EnergySource\n"
            prompt_text += "Allowed Edge Types: INVOLVES_EQUIPMENT, HAS_HAZARD, OCCURRED_AT, INVOLVED_PERSON, CAUSED_BY, RELEASED_ENERGY, RESULTED_IN\n\n"
            
            for r in reports:
                prompt_text += f"--- REPORT {r['report_id']} ---\n{r['text']}\n\n"
                
            # Use structured output for the batch
            structured_llm = self.llm.with_structured_output(BatchGraph)
            batch_result = structured_llm.invoke(prompt_text)
            
            # Now ingest the structured results manually into Neo4j
            for r_graph in batch_result.graphs:
                r_meta = next((r for r in reports if r['report_id'] == r_graph.report_id), {})
                
                # 1. Create Report Node
                cypher_report = """
                MERGE (r:Report {id: $report_id})
                SET r += $metadata, r.text = $text, r.ehs_code = $ehs_code
                """
                self.graph.query(cypher_report, params={
                    "report_id": r_graph.report_id,
                    "metadata": r_meta.get("metadata", {}),
                    "text": r_meta.get("text", ""),
                    "ehs_code": r_meta.get("metadata", {}).get("ehs_code", "Unknown")
                })
                
                # 2. Create Nodes & Link to Report
                for node in r_graph.nodes:
                    node_label = node.label if node.label in ["Equipment", "Hazard", "Location", "Person", "IncidentCause", "EnergySource"] else "Entity"
                    cypher_node = f"""
                    MERGE (n:{node_label} {{id: $node_id}})
                    WITH n
                    MATCH (r:Report {{id: $report_id}})
                    MERGE (r)-[:MENTIONS]->(n)
                    """
                    self.graph.query(cypher_node, params={
                        "node_id": node.id.title(),
                        "report_id": r_graph.report_id
                    })
                    
                # 3. Create Edges between Nodes
                for edge in r_graph.edges:
                    edge_type = edge.type if edge.type in ["INVOLVES_EQUIPMENT", "HAS_HAZARD", "OCCURRED_AT", "INVOLVED_PERSON", "CAUSED_BY", "RELEASED_ENERGY", "RESULTED_IN"] else "RELATED_TO"
                    cypher_edge = f"""
                    MATCH (s {{id: $source_id}})
                    MATCH (t {{id: $target_id}})
                    MERGE (s)-[:{edge_type}]->(t)
                    """
                    self.graph.query(cypher_edge, params={
                        "source_id": edge.source.title(),
                        "target_id": edge.target.title()
                    })
                    
            logger.info(f"Agent 1: Successfully batch-ingested {len(reports)} reports.")
            return True
            
        except Exception as e:
            logger.error(f"Agent 1 Batch Ingestion failed: {e}")
            return False
