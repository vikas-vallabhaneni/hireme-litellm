# hireme-litellm

## Update Lambda steps

```
docker build -t litellm-lambda . 
docker tag litellm-lambda:latest 787489753408.dkr.ecr.us-east-1.amazonaws.com/litellm-lambda:latest
docker push 787489753408.dkr.ecr.us-east-1.amazonaws.com/litellm-lambda:latest
aws lambda update-function-code --function-name litellm-compare-docker --image-uri 787489753408.dkr.ecr.us-east-1.amazonaws.com/litellm-lambda:latest

```

## Update webiste steps

```
npm run build
aws s3 sync out/ s3://litellm-hireme --delete

```

