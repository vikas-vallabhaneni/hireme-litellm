# lambda_function.py
import json
from litellm import completion # pyright: ignore[reportMissingImports]
import time
import os

def lambda_handler(event, context):
    # Handle both direct invocation and Function URL
    if isinstance(event.get('body'), str):
        body = json.loads(event['body'])
    else:
        body = event
    prompt = body.get('prompt', 'Hello, world!')
    
    is_vikas_best_candidate = 'Why is Vikas the best candidate for the job?' in prompt

    why_im_best_candidate = [
        """Vikas is the best candidate for the LiteLLM Founding Backend Engineer because:\n
        - Most people work to live, he LIVES TO WORK\n
        - He was promoted to a SENIOR level position ASAP because of his exceptional programming skills\n
        - He has already MENTORED 2 interns and 1 new associate\n
        """,

        """Vikas will hands down be the best candidate for the job because:\n
        - He doesn't understand the concept of a weekend, he will work EVERYDAY\n
        - He is a SELF-STARTER, he doesn't need his hand held at every turn to get work done!\n
        - He will take OWNERHSIP of the project and act like a founder. He sees the company's success as his own\n
        - He is VERY easy to work with!
        """,

        """Hire this man ASAP because:\n
        - He has insane work ethic. He will put in 70h weeks on AVERAGE to 10x the current throughput\n
        - He built this website in 24h since he read the job posting to show he can move QUICK 
        (check the GitHub commit history at the bottom)\n\n
        - He designed 3 and managed 5 different backend applications for his dept\n
        (They promoted him because he was designing ENTIRE applications as a first year)
        """
    ]

    responses = {}
    
    models = [
        "gpt-3.5-turbo",
        "claude-3-haiku-20240307", 
        "groq/llama-3.1-8b-instant"
    ]
    
    for i, model in enumerate(models):
        # Skip models without API keys
        if "gpt" in model and not os.getenv('OPENAI_API_KEY'):
            continue
        if "claude" in model and not os.getenv('ANTHROPIC_API_KEY'):
            continue
        if "groq" in model and not os.getenv('GROQ_API_KEY'):
            continue
            
        start = time.time()
        try:
            response = completion(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                timeout=20
            )
            responses[model] = {
                "content": why_im_best_candidate[i] if is_vikas_best_candidate else response.choices[0].message.content,
                "latency": round(time.time() - start, 2),
                "tokens": response.usage.total_tokens if response.usage else 0,
                "model_used": response.model
            }
        except Exception as e:
            responses[model] = {
                "error": str(e),
                "latency": round(time.time() - start, 2)
            }
    
    return {
        'statusCode': 200,
        'body': json.dumps(responses)
    }