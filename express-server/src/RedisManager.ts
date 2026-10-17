import { createClient } from "redis";
import { WebSocketManager } from "./WebSocketManager.js";

type UserEvent={
    userId:string;
    event:string;
    data?:unknown
}

export class RedisManager{
    private subscriber=createClient({
        url:"redis://localhost:6379"
    })

    private channel=process.env.REDIS_CHANNEL ?? "user-events"

    constructor(private wsManager:WebSocketManager){
        this.subscriber.on("error",(error)=>{
            console.error("Redis error:", error.message)
        })
    }

    async connect():Promise<void>{
        await this.subscriber.connect()

        await this.subscriber.subscribe(this.channel, (message)=>{
            try{
                const event :UserEvent =JSON.parse(message)

                if(typeof event.userId !== "string" || !event.userId.trim() || typeof event.event !== "string"){
                    console.error("Invalid user event received from Redis");
          return;
                }

                this.wsManager.sendToUser(event.userId,event);
            }catch (error) {
        console.error("Failed to process Redis message:", error);
      }
        })

        console.log(`Subscribed to Redis channel: ${this.channel}`)
    }

    async disconnect():Promise<void>{
        if (this.subscriber.isOpen) {
      await this.subscriber.quit();
    }
    }
}

