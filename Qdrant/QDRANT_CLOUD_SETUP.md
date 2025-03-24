# Setting Up Qdrant Cloud for PSADT Pro UI

This guide walks you through setting up a free Qdrant Cloud account and configuring your application to use it.

## 1. Create a Qdrant Cloud Account

1. Go to [Qdrant Cloud](https://cloud.qdrant.io/)
2. Click on "Sign Up" and create a new account
3. Verify your email address

## 2. Create a Free Cluster

1. Once logged in, click "Create Cluster"
2. Choose the "Free" tier
   - This includes 1GB storage, 1 vCPU, 2GB RAM
   - Suitable for development and testing
3. Select a region closest to you
4. Give your cluster a name (e.g., "psadt-search")
5. Click "Create"
6. Wait for your cluster to be provisioned (usually takes a few minutes)

## 3. Get Your API Credentials

1. Once your cluster is ready, click on it to view details
2. In the cluster details, you'll find:
   - **URL**: The endpoint for your cluster (e.g., `https://abc-123-xyz.us-east.aws.cloud.qdrant.io`)
   - **API Key**: Click "Generate API Key" if one isn't already created

## 4. Update Your Script Configuration

Open `psadt_fastembed_cloud.py` and update these variables:

```python
# Qdrant Cloud connection details
QDRANT_URL = "https://your-cluster-url.qdrant.io"  # Replace with your URL
QDRANT_API_KEY = "your-api-key"  # Replace with your API key
```

## 5. Run the Script

After updating the configuration, run the script:

```bash
python psadt_fastembed_cloud.py
```

## Additional Information

- **Free Tier Limitations**: The free tier is limited to 1GB storage, which is typically enough for thousands of PSADT commands and documentation pages.
- **Paid Tiers**: If you need more resources or higher performance, Qdrant Cloud offers various paid tiers.
- **Data Privacy**: Your data is stored on Qdrant's servers. Review their privacy policy if you have sensitive information.
- **Alternative**: If you prefer to keep everything local, you can use Docker to run Qdrant locally as described in earlier instructions.

## Troubleshooting

- **Connection Issues**: Make sure your firewall allows outbound connections to your Qdrant Cloud cluster.
- **Authentication Errors**: Verify your API key is correct and has not expired.
- **Rate Limiting**: The free tier may have rate limits. If you encounter issues, consider adding retry logic.
