import React, { useState, useEffect, useRef } from 'react';
import { Send, ChevronLeft, MessagesSquareIcon } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';

interface Message {
  sys_id: string;
  sender: string;
  content: string;
  timestamp: string;
}

interface ChatGroup {
  sys_id: string;
  name: string;
  last_message: string;
  unread_count: number;
}

const PulsePlusChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  useEffect(() => {
    const fetchChatGroups = async () => {
      try {
        const response = await fetchWithAuth(`/chat-groups`);
        if (!response.ok) {
          throw new Error('Failed to fetch chat groups');
        }
        const data = await response.json();
        setGroups(data);
      } catch (error) {
        console.error('Error fetching chat groups:', error);
        setError('Failed to load chat groups. Please try again later.');
      }
    };

    if (isOpen) {
      fetchChatGroups();
    }
  }, [isOpen, fetchWithAuth]);

  useEffect(() => {
    const fetchMessages = async (groupId: string) => {
      try {
        const response = await fetchWithAuth(`/messages?group=${groupId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please try again later.');
      }
    };
    
    if (activeGroup) {
      fetchMessages(activeGroup);
      // Here you would set up a WebSocket connection for real-time updates
    }
  }, [activeGroup, fetchWithAuth]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && activeGroup) {
      try {
        const response = await fetchWithAuth(`/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            group: activeGroup,
            content: newMessage,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const sentMessage = await response.json();
        setMessages([...messages, sentMessage]);
        setNewMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message. Please try again.');
      }
    }
  };

  const toggleChat = () => setIsOpen(!isOpen);

  const selectGroup = (groupId: string) => setActiveGroup(groupId);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="fixed bottom-20 right-4 flex flex-col items-end" style={{ zIndex: 99999 }}>
      {isOpen && (
        <div className="bg-white shadow-lg rounded-lg w-80 h-96 flex flex-col mb-4">
          <div className="bg-sky-400 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold">{activeGroup ? groups.find(g => g.sys_id === activeGroup)?.name : 'Chat'}</h3>
            {activeGroup && (
              <button onClick={() => setActiveGroup(null)} className="text-white">
                <ChevronLeft size={24} />
              </button>
            )}
          </div>
          {!activeGroup ? (
            <div className="flex-grow overflow-y-auto p-4">
              {groups.map(group => (
                <div
                  key={group.sys_id}
                  onClick={() => selectGroup(group.sys_id)}
                  className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                >
                  <h4 className="font-bold">{group.name}</h4>
                  <p className="text-sm text-gray-600">{group.last_message}</p>
                  {group.unread_count > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 float-right">
                      {group.unread_count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex-grow overflow-y-auto p-4">
                {messages.map(message => (
                  <div key={message.sys_id} className={`mb-2 ${message.sender === 'You' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block p-2 rounded-lg ${message.sender === 'You' ? 'bg-sky-100' : 'bg-gray-200'}`}>
                      <p className="font-bold">{message.sender}</p>
                      <p>{message.content}</p>
                      <p className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t">
                <div className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-grow border rounded-l-lg p-2"
                    placeholder="Type a message..."
                  />
                  <button onClick={handleSendMessage} className="bg-sky-400 text-white p-2 rounded-r-lg">
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      <button
        onClick={toggleChat}
        className="bg-sky-400 hover:bg-sky-800 text-white p-4 rounded-full shadow-lg flex-shrink-0"
      >
        <MessagesSquareIcon size={24} />
      </button>
    </div>
  );
};

export default PulsePlusChat;