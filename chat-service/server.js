import amqp from 'amqplib';

const RABBITMQ_URL = 'amqp://rabbitmq';

let channel, connection;

const users = new Map();

function getRandomColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

async function connectRabbitMQ() {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue('chat_messages');
        await channel.assertQueue('chat_responses');
        console.log('Chat Service connected to RabbitMQ');
        await consumeMessages();
    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        setTimeout(connectRabbitMQ, 5000);
    }
}

async function processMessage(msg) {
    const content = JSON.parse(msg.content.toString());
    let response;

    switch (content.type) {
        case 'join':
            const color = getRandomColor();
            users.set(content.nickname, { color });
            response = {
                nickname: 'System',
                message: `${content.nickname} joined the chat`,
                timestamp: new Date().toISOString(),
                color: '#888888',
                isSystem: true
            };
            break;
        case 'message':
            const user = users.get(content.content.nickname);
            if (user) {
                response = { ...content.content, color: user.color };
            }
            break;
        case 'leave':
            response = {
                nickname: 'System',
                message: 'A user left the chat',
                timestamp: new Date().toISOString(),
                color: '#888888',
                isSystem: true
            };
            break;
    }

    if (response) {
        await channel.sendToQueue('chat_responses', Buffer.from(JSON.stringify(response)));
    }
}

async function consumeMessages() {
    try {
        await channel.consume('chat_messages', async (msg) => {
            if (msg !== null) {
                await processMessage(msg);
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('Error consuming messages:', error);
        setTimeout(consumeMessages, 5000);
    }
}

async function startService() {
    await connectRabbitMQ();
    console.log('Chat Service is running');
}

startService();