import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import moment from 'moment';

const socket = io('http://localhost:5000');

function App() {
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [isNicknameSet, setIsNicknameSet] = useState(false);

  const chatContainerRef = useRef(null);

  useEffect(() => {
    socket.on('chat message', (msg) => {
      setChat(prevChat => [...prevChat, msg]);
    });

    return () => {
      socket.off('chat message');
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat]);

  const handleNicknameSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim() !== '') {
      setIsNicknameSet(true);
      socket.emit('join', nickname);
    }
  };

  const handleMessageSubmit = (e) => {
    e.preventDefault();
    if (message.trim() !== '') {
      const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
      socket.emit('chat message', { nickname, message, timestamp });
      setMessage('');
    }
  };

  if (!isNicknameSet) {
    return (
      <div className="nickname-form">
        <h2>Enter your nickname</h2>
        <form onSubmit={handleNicknameSubmit}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your nickname"
            required
          />
          <button type="submit">Set Nickname</button>
        </form>
      </div>
    );
  }

  return (
    <div className="chat-app">
      <h1>Welcome to the Chat, {nickname}!</h1>
      <div className="chat-container" ref={chatContainerRef}>
        {chat.map((msg, index) => (
          <div
            key={index}
            className={`chat-item ${msg.isSystem ? 'system-message' : ''}`}
            style={{ color: msg.isSystem ? 'black' : 'white', backgroundColor: msg.color }}
          >
            <span className="timestamp">[{msg.timestamp}] </span>
            <strong>{msg.nickname}: </strong>
            {msg.message}
          </div>
        ))}
      </div>
      <form onSubmit={handleMessageSubmit} className="message-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message"
          required
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;