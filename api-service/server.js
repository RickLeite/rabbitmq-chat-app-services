import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import amqp from 'amqplib';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const PORT = 5000;
const RABBITMQ_URL = 'amqp://rabbitmq';

app.use(cors());
app.use(express.json());

let channel, connection;

async function connectRabbitMQ() {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue('chat_messages');
        await channel.assertQueue('chat_responses');
        console.log('Connected to RabbitMQ');
        await consumeMessages();
    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        setTimeout(connectRabbitMQ, 5000);
    }
}

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join', async (nickname) => {
        console.log(`${nickname} joined the chat`);
        await channel.sendToQueue('chat_messages', Buffer.from(JSON.stringify({ type: 'join', nickname })));
    });

    socket.on('chat message', async (msg) => {
        console.log('Message received: ' + JSON.stringify(msg));
        await channel.sendToQueue('chat_messages', Buffer.from(JSON.stringify({ type: 'message', content: msg })));
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected');
        await channel.sendToQueue('chat_messages', Buffer.from(JSON.stringify({ type: 'leave' })));
    });
});

async function consumeMessages() {
    try {
        await channel.consume('chat_responses', (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                io.emit('chat message', content);
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('Error consuming messages:', error);
        setTimeout(consumeMessages, 5000);
    }
}

async function startServer() {
    await connectRabbitMQ();

    httpServer.listen(PORT, () => {
        console.log(`API Service running on port ${PORT}`);
    });
}

startServer();