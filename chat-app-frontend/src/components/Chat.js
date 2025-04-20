import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

function Chat({ setIsAuthenticated }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  
  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      auth: {
        token
      }
    });
    
    setSocket(newSocket);
    
    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [token]);
  
  // Set up message listeners
  useEffect(() => {
    if (!socket) return;
    
    // Handle incoming messages
    socket.on('receive-message', (message) => {
      if (selectedUser && message.sender === selectedUser._id) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    });
    
    // Handle sent message confirmation
    socket.on('message-sent', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });
    
    // Clean up event listeners
    return () => {
      socket.off('receive-message');
      socket.off('message-sent');
    };
  }, [socket, selectedUser]);
  
  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/users', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Filter out current user
        setUsers(response.data.filter(user => user._id !== userId));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, [token, userId]);
  
  // Fetch messages when a user is selected
  useEffect(() => {
    if (!selectedUser) return;
    
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/messages/${selectedUser._id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    fetchMessages();
  }, [selectedUser, token]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedUser || !socket) return;
    
    socket.emit('send-message', {
      recipientId: selectedUser._id,
      content: newMessage
    });
    
    setNewMessage('');
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
  };
  
  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Chat App</h3>
          <div className="user-info">
            <span>{username}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
        <div className="users-list">
          <h4>Users</h4>
          {users.map(user => (
            <div
              key={user._id}
              className={`user-item ${selectedUser && selectedUser._id === user._id ? 'active' : ''}`}
              onClick={() => handleUserSelect(user)}
            >
              {user.username}
            </div>
          ))}
        </div>
      </div>
      
      <div className="chat-area">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <h3>{selectedUser.username}</h3>
            </div>
            <div className="messages">
              {messages.map(message => (
                <div
                  key={message._id}
                  className={`message ${message.sender === userId ? 'sent' : 'received'}`}
                >
                  <div className="message-content">{message.content}</div>
                  <div className="message-timestamp">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="message-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <p>Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
