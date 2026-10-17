
import { WebSocket, WebSocketServer } from "ws";
import type { Server } from "http";

export class WebSocketManager {
    private wss: WebSocketServer;
    private users = new Map<string, Set<WebSocket>>();

    constructor(server: Server) {
        this.wss = new WebSocketServer({ server });

        this.wss.on("connection", (socket) => {
            let userId: string | undefined;

            console.log("New WebSocket connection");

            socket.on("message", (message, isBinary) => {
                if (userId) {
                    socket.send(JSON.stringify({
                        error: "user id already been registered"
                    }));
                    return;
                }

                if (isBinary) {
                    socket.close(1003, "Send the user ID as text");
                    return;
                }

                const receivedId = message.toString().trim();

                if (!receivedId || receivedId.length > 128) {
                    socket.close(1008, "Invalid user ID");
                    return;
                }

                userId = receivedId;

                const connection =
                    this.users.get(userId) ?? new Set<WebSocket>();

                connection.add(socket);
                this.users.set(userId, connection);

                socket.send(JSON.stringify({
                    type: "registered",
                    userId
                }));

                console.log(`User registered: ${userId}`);
            }); // IMPORTANT: closes the message listener

            socket.on("close", () => {
                if (!userId) {
                    return;
                }

                const connections = this.users.get(userId);

                if (!connections) {
                    return;
                }

                connections.delete(socket);

                if (connections.size === 0) {
                    this.users.delete(userId);
                }

                console.log(`Connection closed for user: ${userId}`);
            });

             socket.on("error", (error) => {
        console.error("WebSocket error:", error.message);
      });
    
        });
    }

    public sendToUser(userId:string,event:unknown):void{
        const connections=this.users.get(userId)

        if(!connections){
            console.log(`User ${userId} is not connected`)
            return
        }

        const payload=JSON.stringify(event)

        for(const socket of connections){
        if(socket.readyState === WebSocket.OPEN){
            socket.send(payload)
        }         
        }
    }

    public close():Promise<void>{
        for(const socket of this.wss.clients){
            socket.close(1001, "Server shutting down")
        }
      return new Promise((resolve, reject) => {
      this.wss.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}