import ChatModel from '../models/chat.model';
import MessageModel from '../models/messages.model';
import UserModel from '../models/users.model';
import { Chat, ChatResponse, CreateChatPayload } from '../types/chat';
import { Message, MessageResponse } from '../types/message';

/**
 * Creates and saves a new chat document in the database, saving messages dynamically.
 *
 * @param chat - The chat object to be saved, including full message objects.
 * @returns {Promise<ChatResponse>} - Resolves with the saved chat or an error message.
 */
export const saveChat = async (chatPayload: CreateChatPayload): Promise<ChatResponse> => {
  try {
    const messageIds = [];

    for (const message of chatPayload.messages) {
      const created = await MessageModel.create({
        ...message,
        type: 'direct', // required as per spec
      });
      messageIds.push(created._id);
    }

    const chatDoc = new ChatModel({
      participants: chatPayload.participants,
      messages: messageIds,
    });

    const savedChat = await chatDoc.save();
    return savedChat;
  } catch (err) {
    console.error('[saveChat]', err);
    return { error: 'Failed to create chat' };
  }
};

/**
 * Creates and saves a new message document in the database.
 * @param messageData - The message data to be created.
 * @returns {Promise<MessageResponse>} - Resolves with the created message or an error message.
 */
export const createMessage = async (messageData: Message): Promise<MessageResponse> => {
  try {
    const newMsg = await MessageModel.create({ ...messageData, type: 'direct' });
    return newMsg;
  } catch (err) {
    console.error('[createMessage]', err);
    return { error: 'Failed to create message' };
  }
};


/**
 * Adds a message ID to an existing chat.
 * @param chatId - The ID of the chat to update.
 * @param messageId - The ID of the message to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addMessageToChat = async (chatId: string, messageId: string): Promise<ChatResponse> => {
  try {
    const updatedChat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $push: { messages: messageId } },
      { new: true }
    );
    if (!updatedChat) return { error: 'Chat not found' };
    return updatedChat;
  } catch (err) {
    console.error('[addMessageToChat]', err);
    return { error: 'Failed to add message to chat' };
  }
};


/**
 * Retrieves a chat document by its ID.
 * @param chatId - The ID of the chat to retrieve.
 * @returns {Promise<ChatResponse>} - Resolves with the found chat object or an error message.
 */
export const getChat = async (chatId: string): Promise<ChatResponse> => {
  try {
    const chat = await ChatModel.findById(chatId).populate('messages');
    if (!chat) return { error: 'Chat not found' };
    return chat;
  } catch (err) {
    console.error('[getChat]', err);
    return { error: 'Failed to retrieve chat' };
  }
};


/**
 * Retrieves chats that include all the provided participants.
 * @param p An array of participant usernames to match in the chat's participants.
 * @returns {Promise<Chat[]>} A promise that resolves to an array of chats where the participants match.
 * If no chats are found or an error occurs, the promise resolves to an empty array.
 */
export const getChatsByParticipants = async (p: string[]): Promise<Chat[]> => {
  try {
    const chats = await ChatModel.find({ participants: { $all: p } }).populate('messages');
    return chats;
  } catch (err) {
    console.error('[getChatsByParticipants]', err);
    return [];
  }
};


/**
 * Adds a participant to an existing chat.
 *
 * @param chatId - The ID of the chat to update.
 * @param userId - The ID of the user to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addParticipantToChat = async (chatId: string, userId: string): Promise<ChatResponse> => {
  try {
    const updatedChat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $addToSet: { participants: userId } },
      { new: true }
    );
    if (!updatedChat) return { error: 'Chat not found' };
    return updatedChat;
  } catch (err) {
    console.error('[addParticipantToChat]', err);
    return { error: 'Failed to add participant' };
  }
};

