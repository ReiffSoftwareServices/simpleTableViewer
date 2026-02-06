# Setup Instructions for Local Development and Azure Deployment

## Local Development
1. Clone the repository using `git clone` command:
   ```bash
   git clone https://github.com/ReiffSoftwareServices/simpleTableViewer.git
   ```
2. Navigate to the project directory:
   ```bash
   cd simpleTableViewer
   ```
3. Install the required dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm start
   ```

## Azure Deployment
1. Ensure you have the Azure CLI installed.
2. Log in to your Azure account:
   ```bash
   az login
   ```
3. Create a new Azure Web App:
   ```bash
   az webapp create --resource-group <YourResourceGroup> --plan <YourAppServicePlan> --name <YourAppName> --runtime "NODE|14-lts"
   ```
4. Deploy your app:
   ```bash
   az webapp deploy --resource-group <YourResourceGroup> --name <YourAppName> --src-path ./dist
   ```
5. Open your app in a browser:
   ```bash
   az webapp browse --name <YourAppName> --resource-group <YourResourceGroup>
   ```