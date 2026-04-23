
## Canvas Service
This serivce is in charge of storing and creating the canvas for the users.
The idea is that the app-service provides the board id and the canvas service provides the canvas data. so the Frotend service can start making it.

Language used in this service:
- Go
Datastore for this service:
- MongoDB
Containerization:
- Docker
Orchestration:
- Docker compose

## Canvas design:

The idea is to have a collection of nodes. Those nodes range from Services to databases.

Here is a list of the nodes that we currently want to have:

- Microservices
- Databases
- Queues
- Caches
- Aws-Services
- Google-services
- AI-Models-Providers
- Serverless services


And then we should be able to connect these nodes by stuff like:

- HTTP REST calls (POST,GET,DELETE,PATCH) -> The user should be able to configure headers, payload and expected response.
- TCP connections
- Message queue publish and consume. Same thing as before, user should be able to configure stuff like queues.
- Database connections. (SQL queries)
- Websockets
- Streaming data. Sensor data for exmaple.


The structure of the nodes and connectors should be made modular so we can add more nodes and connections later.

Another thing that we should have is configurations such a dockerfiles and docker compose for the project.

The Canvas should be stored as 1 mongo document. This allows custom congirations:

```
{
  "canvas_id": "project_123",
  "nodes": [
    {
      "id": "node_1",
      "type": "database",
      "label": "UserDB",
      "position": { "x": 100, "y": 250 },
      "config": {
        "engine": "PostgreSQL",
        "version": "15",
        "port": 5432
      }
    },
    {
      "id": "node_2",
      "type": "aws-service",
      "label": "FileStorage",
      "position": { "x": 400, "y": 250 },
      "config": {
        "service_name": "S3",
        "region": "us-east-1",
        "is_public": false
      }
    }
  ],
  "edges": [
    { "from": "node_1", "to": "node_2", "label": "Backup Flow", "protocol": "HTTPS" }
  ]
}
```


