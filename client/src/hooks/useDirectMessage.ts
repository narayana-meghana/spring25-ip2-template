import { useEffect, useState } from 'react';
import { Chat, ChatUpdatePayload, Message, User } from '../types';
import useUserContext from './useUserContext';
import { createChat, getChatById, getChatsByUser, sendMessage } from '../services/chatService';

/**
 * useDirectMessage is a custom hook that provides state and functions for direct messaging between users.
 * It includes a selected user, messages, and a new message state.
 */

const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const handleJoinChat = (chatID: string) => {
    socket?.emit('joinChat', chatID);
  };

  const handleSendMessage = async () => {
    if (!selectedChat || newMessage.trim() === '') return;

    const updatedChat = await sendMessage(
      {
        msg: newMessage,
        msgFrom: user.username,
        msgDateTime: new Date(), 
      },
      selectedChat._id!
    );       

    if ('error' in updatedChat) return;

    setSelectedChat(updatedChat);
    setNewMessage('');
  };

  const handleChatSelect = async (chatID: string | undefined) => {
    if (!chatID) return;

    const fetchedChat = await getChatById(chatID);
    if ('error' in fetchedChat) return;

    setSelectedChat(fetchedChat);
    handleJoinChat(chatID);
  };

  const handleUserSelect = (selectedUser: User) => {
    setChatToCreate(selectedUser.username);
  };

  const handleCreateChat = async () => {
    if (!chatToCreate || !user.username) return;

    const newChat = await createChat([user.username, chatToCreate]);

    if ('error' in newChat) return;

    setChats(prev => [...prev, newChat]);
    setSelectedChat(newChat);
    handleJoinChat(newChat._id!);
    setShowCreatePanel(false);
    setChatToCreate('');
  };  

  useEffect(() => {
    const fetchChats = async () => {
      const userChats = await getChatsByUser(user.username);
      if (Array.isArray(userChats)) setChats(userChats);
    };

    const handleChatUpdate = (chatUpdate: ChatUpdatePayload) => {
      const { type, chat } = chatUpdate;

      if (type === 'created') {
        setChats(prev => [...prev, chat]);
      } else if (type === 'newMessage') {
        setSelectedChat(prev => (prev && prev._id === chat._id ? chat : prev));
      } else {
        throw new Error(`Unknown chatUpdate type: ${type}`);
      }
    };


    fetchChats();

    socket?.on('chatUpdate', handleChatUpdate);

    return () => {
      socket?.off('chatUpdate', handleChatUpdate);
      if (selectedChat?._id) {
        socket?.emit('leaveChat', selectedChat._id);
      }
    };
  }, [user.username, socket, selectedChat?._id]);

  return {
    selectedChat,
    chatToCreate,
    chats,
    newMessage,
    setNewMessage,
    showCreatePanel,
    setShowCreatePanel,
    handleSendMessage,
    handleChatSelect,
    handleUserSelect,
    handleCreateChat,
  };
};

export default useDirectMessage;
