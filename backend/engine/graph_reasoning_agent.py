import logging
from typing import Dict, Any, List

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.graphs import Neo4jGraph
from langchain_community.chains.graph_qa.cypher import GraphCypherQAChain
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)

class GraphReasoningAgent:
    def __init__(self, neo4j_uri: str, neo4j_user: str, neo4j_password: str):
        self.graph = Neo4jGraph(
            url=neo4j_uri,
            username=neo4j_user,
            password=neo4j_password
        )
        
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-3.5-flash",
            temperature=0,
            convert_system_message_to_human=True
        )
        
        # Cypher QA Chain for custom prompts
        self.cypher_chain = GraphCypherQAChain.from_llm(
            graph=self.graph,
            cypher_llm=self.llm,
            qa_llm=self.llm,
            verbose=True,
            allow_dangerous_requests=True # Required to execute generated Cypher
        )

    def find_sif_patterns(self, report_id: str) -> Dict[str, Any]:
        """
        Executes a Cypher query to find multi-hop SIF risks related to this report.
        This manually queries the graph to return nodes and edges for the frontend visualization.
        """
        logger.info(f"Agent 2: Inferring hidden SIF risks for report {report_id}...")
        
        # We look for the report, and its connected hazards, locations, and other reports sharing those
        cypher_query = """
        MATCH (r1:Report {id: $report_id})-[e1:MENTIONS]->(n)<-[e2:MENTIONS]-(r2:Report)
        WHERE r1 <> r2
        RETURN r1, e1, n, e2, r2
        LIMIT 50
        """
        
        try:
            results = self.graph.query(cypher_query, params={"report_id": report_id})
            
            nodes = {}
            edges = []
            
            # Format results into the exact { nodes: [], edges: [] } structure expected by frontend
            for record in results:
                # Add source report
                r1 = record["r1"]
                nodes[r1["id"]] = {
                    "id": r1["id"],
                    "label": r1["id"],
                    "type": "source",
                    "preview": r1.get("text", "")[:100],
                    "category": r1.get("ehs_code", "Unknown")
                }
                
                # Add intermediate node
                n = record["n"]
                n_id = n.get("id", str(hash(str(n))))
                nodes[n_id] = {
                    "id": n_id,
                    "label": list(n.labels)[0] if hasattr(n, 'labels') else "Entity",
                    "type": "entity",
                    "preview": str(n)
                }
                
                # Add target report
                r2 = record["r2"]
                nodes[r2["id"]] = {
                    "id": r2["id"],
                    "label": r2["id"],
                    "type": "linked",
                    "preview": r2.get("text", "")[:100],
                    "category": r2.get("ehs_code", "Unknown")
                }
                
                # Add edges
                edges.append({
                    "source": r1["id"],
                    "target": n_id,
                    "label": record["e1"][1] if isinstance(record["e1"], tuple) else "RELATED",
                    "strength": 0.8
                })
                edges.append({
                    "source": n_id,
                    "target": r2["id"],
                    "label": record["e2"][1] if isinstance(record["e2"], tuple) else "RELATED",
                    "strength": 0.5
                })
                
            return {
                "source_id": report_id,
                "nodes": list(nodes.values()),
                "edges": edges,
                "total_linked": len(edges) // 2
            }
            
        except Exception as e:
            logger.error(f"Agent 2 Failed to find SIF patterns: {e}")
            return {"source_id": report_id, "nodes": [], "edges": [], "total_linked": 0}

    def answer_custom_prompt(self, prompt: str) -> str:
        """
        Translates a natural language prompt into Cypher, queries Neo4j, and returns an answer.
        """
        logger.info(f"Agent 2: Answering custom prompt: {prompt}")
        try:
            response = self.cypher_chain.invoke({"query": prompt})
            return response.get("result", "Could not generate an answer.")
        except Exception as e:
            logger.error(f"Agent 2 Failed to answer prompt: {e}")
            return f"Error querying knowledge graph: {str(e)}"

    def run_manual_analysis(self, user_prompt: str = "") -> str:
        """
        Runs a deep, nuanced graph analysis using the LLM QA Chain.
        """
        logger.info("Agent 2: Running manual deep analysis...")
        
        system_prompt = """
        You are Agent 2, an elite enterprise safety AI operating over a Graph Database.
        Your goal is to infer nuanced, non-obvious patterns that may lead to Serious Injuries and Fatalities (SIF).
        You must query the database to discover:
        1. Repeated near-misses that share the same hazard or equipment across different sites.
        2. Hidden correlations between barrier failures, energy sources, and incident categories.
        3. Escalation chains (e.g., a hazard observation that later led to an incident).
        
        Base your entire analysis purely on the data present in the graph. Do not invent data.
        Provide a detailed, executive-ready summary of the most critical risks hidden in the network.
        Format your response in clean markdown.
        """
        
        if user_prompt:
            system_prompt += f"\n\nAdditionally, the user has provided the following specific query or context:\n\"{user_prompt}\"\n\nPlease address this query directly using the graph data."
        else:
            system_prompt += "\n\nProvide a comprehensive scan of the most dangerous hidden patterns currently in the database."

        try:
            response = self.cypher_chain.invoke({"query": system_prompt})
            return response.get("result", "Could not generate an analysis.")
        except Exception as e:
            logger.error(f"Agent 2 manual analysis failed: {e}")
            return f"Error executing deep analysis over the knowledge graph: {str(e)}\n\n(Note: This might be due to LLM rate limits or missing graph data.)"

    def check_sif_pattern_fast(self, location: str, hazard: str) -> str:
        """
        Fast Cypher-only check for repeating hazards at a location (0 API calls).
        Replaces the slow/expensive LLM Cypher QA Chain.
        """
        if not location or location == "Unknown":
            return "NO_PATTERN"
            
        cypher = """
        MATCH (r1:Report)-[:MENTIONS]->(l:Location)
        WHERE toLower(l.id) CONTAINS toLower($location)
        MATCH (r1)-[:MENTIONS]->(h)
        WHERE (h:Hazard OR h:IncidentCause) 
          AND (toLower(h.id) CONTAINS toLower($hazard) OR $hazard = 'unknown')
        WITH count(r1) as incident_count
        WHERE incident_count > 1
        RETURN incident_count
        """
        try:
            results = self.graph.query(cypher, params={"location": location, "hazard": hazard or "unknown"})
            if results and len(results) > 0:
                count = results[0]["incident_count"]
                if count > 1:
                    return f"SIF_PATTERN_DETECTED: {count} previous incidents involving '{hazard}' recorded at '{location}'. Immediate intervention recommended."
            return "NO_PATTERN"
        except Exception as e:
            logger.error(f"Agent 2 fast SIF check failed: {e}")
            return "NO_PATTERN"

    def get_global_insights(self) -> Dict[str, Any]:
        """
        Fast Cypher-only extraction of global safety insights from the Knowledge Graph.
        """
        insights = {
            "top_hazards": [],
            "top_locations": [],
            "total_reports": 0
        }
        
        try:
            # Get total reports
            total_res = self.graph.query("MATCH (r:Report) RETURN count(r) as total")
            if total_res: insights["total_reports"] = total_res[0]["total"]
            
            # Get top hazards
            hazard_cypher = """
            MATCH (r:Report)-[:MENTIONS]->(h:Hazard)
            RETURN h.id as hazard, count(r) as count
            ORDER BY count DESC LIMIT 5
            """
            hazard_res = self.graph.query(hazard_cypher)
            insights["top_hazards"] = [{"label": row["hazard"], "count": row["count"]} for row in hazard_res]
            
            # Get top locations
            loc_cypher = """
            MATCH (r:Report)-[:MENTIONS]->(l:Location)
            RETURN l.id as location, count(r) as count
            ORDER BY count DESC LIMIT 5
            """
            loc_res = self.graph.query(loc_cypher)
            insights["top_locations"] = [{"label": row["location"], "count": row["count"]} for row in loc_res]
            
        except Exception as e:
            logger.error(f"Agent 2 global insights failed: {e}")
            
        return insights
