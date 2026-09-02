import os
import re

def html_to_jsx(html_content):
    # Remove DOCTYPE, html, head, body tags
    body_match = re.search(r'<body[^>]*>(.*)</body>', html_content, re.DOTALL | re.IGNORECASE)
    if body_match:
        html_content = body_match.group(1)
    
    # Basic replacements
    html_content = html_content.replace('class="', 'className="')
    html_content = html_content.replace('for="', 'htmlFor="')
    html_content = html_content.replace('<!--', '{/*').replace('-->', '*/}')
    
    # Self-closing tags
    for tag in ['input', 'img', 'br', 'hr']:
        html_content = re.sub(rf'<{tag}([^>]*?)(?<!/)>', rf'<{tag}\1 />', html_content)
        
    return html_content

for filename in ['reports_dashboard.html', 'report_detail.html', 'upload_reports.html']:
    with open(filename, 'r') as f:
        html = f.read()
    
    jsx = html_to_jsx(html)
    component_name = ''.join(word.title() for word in filename.split('.')[0].split('_'))
    
    output = f"""import React from 'react';

export default function {component_name}() {{
  return (
    <>
      {jsx}
    </>
  );
}}
"""
    with open(f"../frontend/src/components/{component_name}.jsx", 'w') as f:
        f.write(output)

print("Conversion done.")
