# WORKFLOW EXAMPLE

- A user is created
- The user has two options, create a team or join a team
- The user create a team
- The team is created
- The user add his member staff in the team
- The user connect 1 or more AWS account in their team
- The system will call AWS CUR API to get an extensive detail of their expenses in their business
- The system will add the necessary data in a table and will create another one for efficiency at the moment of display
- The system will pick the relevant data to put them in an ML Algorithm
- If the model find anomalies, it will record each of them in a table
- After finding anomalies, it will run another ML algorithm or LLM that with that information and with context information for recommendations
- Each recommendation will recorded in a table
- The user will see their usage and cost, with the anomalies found in their cost & usage, the reason of why and the respective recomendation.
- Every action in the application will be recorded in audit_logs

END OF WORKFLOW
