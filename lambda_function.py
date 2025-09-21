# lambda_function.py
import json
from litellm import completion
import time

def lambda_handler(event, context):
    body = json.loads(event['body'])
    prompt = body['prompt']
    
    responses = {}
    
    models = [
        "gpt-3.5-turbo",
        "claude-3-haiku-20240307", 
        "groq/llama3-8b-8192"
    ]
    
    for model in models:
        start = time.time()
        try:
            response = completion(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500
            )
            responses[model] = {
                "content": response.choices[0].message.content,
                "latency": round(time.time() - start, 2),
                "tokens": response.usage.total_tokens,
                "cost": response._hidden_params.get('response_cost', 0)
            }
        except Exception as e:
            responses[model] = {"error": str(e)}
    
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(responses)
    }