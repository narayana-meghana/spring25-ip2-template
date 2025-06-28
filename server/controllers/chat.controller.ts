import express, { Response } from 'express';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../services/chat.service';
import { populateDocument } from '../utils/database.util';
import {
  CreateChatRequest,
  AddMessageRequestToChat,
  AddParticipantRequest,
  ChatIdRequest,
  GetChatByParticipantsRequest,
} from '../types/chat';
import { FakeSOSocket } from '../types/socket';

/*
 * This controller handles chat-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the chat routes.
 * @throws {Error} Throws an error if the chat creation fails.
 */
const chatController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Validates that the request body contains all required fields for a chat.
   * @param req The incoming request containing chat data.
   * @returns `true` if the body contains valid chat fields; otherwise, `false`.
   */
  const isCreateChatRequestValid = (req: CreateChatRequest): boolean => {
    const { participants, messages } = req.body;

    return (
      Array.isArray(participants) &&
      participants.every(p => typeof p === 'string') &&
      Array.isArray(messages) &&
      messages.every(
        m =>
          typeof m.msg === 'string' &&
          typeof m.msgFrom === 'string' &&
          (typeof m.msgDateTime === 'string' || typeof m.msgDateTime === 'undefined')
      )
    );
  };

  /**
   * Validates that the request body contains all required fields for a message.
   * @param req The incoming request containing message data.
   * @returns `true` if the body contains valid message fields; otherwise, `false`.
   */
  const isAddMessageRequestValid = (req: AddMessageRequestToChat): boolean => {
    const { msg, msgFrom, msgDateTime } = req.body;

    return (
      typeof msg === 'string' &&
      typeof msgFrom === 'string' &&
      (typeof msgDateTime === 'string' || typeof msgDateTime === 'undefined')
    );
  };

  /**
   * Validates that the request body contains all required fields for a participant.
   * @param req The incoming request containing participant data.
   * @returns `true` if the body contains valid participant fields; otherwise, `false`.
   */
  const isAddParticipantRequestValid = (req: AddParticipantRequest): boolean => {
    return typeof req.body.userId === 'string';
  };

  /**
   * Creates a new chat with the given participants (and optional initial messages).
   * @param req The request object containing the chat data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is created.
   * @throws {Error} Throws an error if the chat creation fails.
   */
  const createChatRoute = async (req: CreateChatRequest, res: Response): Promise<void> => {
    try {
      if (!isCreateChatRequestValid(req)) {
        res.status(400).json({ error: 'Invalid request payload' });
        return;
      }

      const chat = await saveChat(req.body);
      if ('error' in chat) {
        res.status(500).json({ error: chat.error });
        return;
      }

      const populated = await populateDocument(chat._id.toString(), 'chat');
      if ('error' in populated) {
        res.status(500).json({ error: populated.error });
        return;
      }

      socket.emit('chatUpdate', { chat: populated, type: 'created' });
      res.status(201).json(populated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create chat' });
    }
  };


  /**
   * Adds a new message to an existing chat.
   * @param req The request object containing the message data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the message is added.
   * @throws {Error} Throws an error if the message addition fails.
   */
  const addMessageToChatRoute = async (
    req: AddMessageRequestToChat,
    res: Response,
  ): Promise<void> => {
    try {
      if (!isAddMessageRequestValid(req)) {
        res.status(400).json({ error: 'Invalid message payload' });
        return;
      }

      const { chatId } = req.params;
      const newMessage = await createMessage({
        ...req.body,
        type: 'direct',
        msgDateTime: req.body.msgDateTime ? new Date(req.body.msgDateTime) : new Date(),
      });
      
      if ('error' in newMessage) {
        res.status(500).json({ error: newMessage.error });
        return;
      }
      if (!newMessage._id) {
        res.status(500).json({ error: 'Message creation returned no ID' });
        return;
      }
      
      const updated = await addMessageToChat(chatId, newMessage._id.toString());
      if ('error' in updated) {
        res.status(500).json({ error: updated.error });
        return;
      }

      const enrichedChat = await populateDocument(chatId, 'chat');
      if ('error' in enrichedChat) {
        res.status(500).json({ error: enrichedChat.error });
        return;
      }

      socket.to(chatId).emit('chatUpdate', { chat: enrichedChat, type: 'newMessage' });
      res.status(200).json(enrichedChat);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add message to chat' });
    }
  };


  /**
   * Retrieves a chat by its ID, optionally populating participants and messages.
   * @param req The request object containing the chat ID.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is retrieved.
   * @throws {Error} Throws an error if the chat retrieval fails.
   */
  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    try {
      const chat = await populateDocument(req.params.chatId, 'chat');
      if ('error' in chat) {
        res.status(404).json({ error: chat.error });
        return;
      }

      res.status(200).json(chat);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve chat' });
    }
  };


  /**
   * Retrieves chats for a user based on their username.
   * @param req The request object containing the username parameter in `req.params`.
   * @param res The response object to send the result, either the populated chats or an error message.
   * @returns {Promise<void>} A promise that resolves when the chats are successfully retrieved and populated.
   */
  const getChatsByUserRoute = async (
    req: GetChatByParticipantsRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { username } = req.params;
      const rawChats = await getChatsByParticipants([username]);

      const populatedChats = await Promise.all(
        rawChats.map(chat => populateDocument(chat._id.toString(), 'chat'))
      );

      const validChats = populatedChats.filter(chat => !('error' in chat));
      res.status(200).json(validChats);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user chats' });
    }
  };


  /**
   * Adds a participant to an existing chat.
   * @param req The request object containing the participant data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the participant is added.
   * @throws {Error} Throws an error if the participant addition fails.
   */
  const addParticipantToChatRoute = async (
    req: AddParticipantRequest,
    res: Response,
  ): Promise<void> => {
    try {
      if (!isAddParticipantRequestValid(req)) {
        res.status(400).json({ error: 'Invalid participant payload' });
        return;
      }

      const updated = await addParticipantToChat(req.params.chatId, req.body.userId);
      if ('error' in updated) {
        res.status(500).json({ error: updated.error });
        return;
      }

      const enriched = await populateDocument(updated._id.toString(), 'chat');
      if ('error' in enriched) {
        res.status(500).json({ error: enriched.error });
        return;
      }

      res.status(200).json(enriched);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add participant' });
    }
  };


  socket.on('connection', conn => {
    conn.on('joinChat', (chatId: string) => {
      if (chatId) {
        conn.join(chatId);
        console.log(`[socket] user joined chat room: ${chatId}`);
      }
    });

    conn.on('leaveChat', (chatId?: string) => {
      if (typeof chatId === 'string') {
        conn.leave(chatId);
        console.log(`[socket] user left chat room: ${chatId}`);
      }
    });
  });

  // Register the routes
  router.post('/create', createChatRoute);
  router.post('/:chatId/message', addMessageToChatRoute);
  router.get('/:chatId', getChatRoute);
  router.post('/:chatId/participant', addParticipantToChatRoute);
  router.get('/user/:username', getChatsByUserRoute);

  return router;
};

export default chatController;
