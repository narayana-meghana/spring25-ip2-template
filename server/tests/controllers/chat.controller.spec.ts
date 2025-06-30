import mongoose from 'mongoose';
import supertest from 'supertest';
import { app } from '../../app';
import * as chatService from '../../services/chat.service';
import * as databaseUtil from '../../utils/database.util';
import MessageModel from '../../models/messages.model';
import ChatModel from '../../models/chat.model';
import { Chat } from '../../types/chat';
import { Message } from '../../types/message';

/**
 * Spies on the service functions
 */
const saveChatSpy = jest.spyOn(chatService, 'saveChat');
const createMessageSpy = jest.spyOn(chatService, 'createMessage');
const addMessageSpy = jest.spyOn(chatService, 'addMessageToChat');
const getChatSpy = jest.spyOn(chatService, 'getChat');
const addParticipantSpy = jest.spyOn(chatService, 'addParticipantToChat');
const populateDocumentSpy = jest.spyOn(databaseUtil, 'populateDocument');
const getChatsByParticipantsSpy = jest.spyOn(chatService, 'getChatsByParticipants');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

/**
 * Sample test suite for the /chat endpoints
 */
describe('Chat Controller', () => {
  describe('POST /chat/create', () => {
    it('should create a new chat successfully', async () => {
      const validChatPayload = {
        participants: ['user1', 'user2'],
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };

      const serializedPayload = {
        ...validChatPayload,
        messages: validChatPayload.messages.map(message => ({
          ...message,
          msgDateTime: message.msgDateTime.toISOString(),
        })),
      };

      const chatResponse: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01'),
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'user1',
            },
            type: 'direct',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      saveChatSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue(chatResponse);

      const response = await supertest(app).post('/chat/create').send(validChatPayload);

      expect(response.status).toBe(201);

      expect(response.body).toMatchObject({
        _id: chatResponse._id?.toString(),
        participants: chatResponse.participants.map(participant => participant.toString()),
        messages: chatResponse.messages.map(message => ({
          ...message,
          _id: message._id?.toString(),
          msgDateTime: message.msgDateTime.toISOString(),
          user: {
            ...message.user,
            _id: message.user?._id.toString(),
          },
        })),
        createdAt: chatResponse.createdAt?.toISOString(),
        updatedAt: chatResponse.updatedAt?.toISOString(),
      });

      expect(saveChatSpy).toHaveBeenCalledWith(serializedPayload);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chatResponse._id?.toString(), 'chat');
    });

    it('should return 400 for invalid request payload', async () => {
      const invalidPayload = {
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };

      const response = await supertest(app).post('/chat/create').send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid request payload' });
      expect(saveChatSpy).not.toHaveBeenCalled();
    });

    it('should return 500 when saveChat service fails', async () => {
      const validPayload = {
        participants: ['user1', 'user2'],
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };

      saveChatSpy.mockResolvedValue({ error: 'Database error' });

      const response = await supertest(app).post('/chat/create').send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Database error' });
    });

    it('should return 500 when populateDocument fails', async () => {
      const validPayload = {
        participants: ['user1', 'user2'],
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };

      const chatResponse = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      saveChatSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue({ error: 'Population error' });

      const response = await supertest(app).post('/chat/create').send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Population error' });
    });

    it('should handle exceptions and return 500', async () => {
      const validPayload = {
        participants: ['user1', 'user2'],
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };

      saveChatSpy.mockRejectedValue(new Error('Unexpected error'));

      const response = await supertest(app).post('/chat/create').send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to create chat' });
    });
  });

  describe('POST /chat/:chatId/message', () => {
    it('should add a message to chat successfully', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messagePayload: Message = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };

      const expectedPayload = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };

      const messageResponse = {
        _id: new mongoose.Types.ObjectId(),
        ...messagePayload,
        user: {
          _id: new mongoose.Types.ObjectId(),
          username: 'user1',
        },
      };

      const chatResponse = {
        _id: chatId,
        participants: ['user1', 'user2'],
        messages: [messageResponse],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      createMessageSpy.mockResolvedValue(messageResponse);
      addMessageSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue(chatResponse);

      const response = await supertest(app).post(`/chat/${chatId}/message`).send(messagePayload);

      expect(response.status).toBe(200);
      expect(createMessageSpy).toHaveBeenCalledWith(expectedPayload);
      expect(addMessageSpy).toHaveBeenCalledWith(chatId.toString(), messageResponse._id.toString());
      expect(populateDocumentSpy).toHaveBeenCalledWith(chatResponse._id.toString(), 'chat');
    });

    it('should return 400 for invalid message payload', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const invalidPayload = {
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
      };

      const response = await supertest(app).post(`/chat/${chatId}/message`).send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid message payload' });
      expect(createMessageSpy).not.toHaveBeenCalled();
    });

    it('should return 500 when createMessage service fails', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const validPayload = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
      };

      createMessageSpy.mockResolvedValue({ error: 'Message creation failed' });

      const response = await supertest(app).post(`/chat/${chatId}/message`).send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Message creation failed' });
    });

    it('should return 500 when addMessageToChat service fails', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const validPayload = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
      };

      const messageResponse = {
        _id: new mongoose.Types.ObjectId(),
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct' as const,
        user: {
          _id: new mongoose.Types.ObjectId(),
          username: 'user1',
        },
      };

      createMessageSpy.mockResolvedValue(messageResponse);
      addMessageSpy.mockResolvedValue({ error: 'Failed to add message' });

      const response = await supertest(app).post(`/chat/${chatId}/message`).send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to add message' });
    });

    it('should handle exceptions and return 500', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const validPayload = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
      };

      createMessageSpy.mockRejectedValue(new Error('Unexpected error'));

      const response = await supertest(app).post(`/chat/${chatId}/message`).send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to add message to chat' });
    });
  });

  describe('GET /chat/:chatId', () => {
    it('should retrieve a chat by ID', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();

      const mockFoundChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1'],
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01T00:00:00Z'),
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'user1',
            },
            type: 'direct',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      populateDocumentSpy.mockResolvedValue(mockFoundChat);

      const response = await supertest(app).get(`/chat/${chatId}`);

      expect(response.status).toBe(200);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chatId, 'chat');
    });

    it('should return 404 when chat is not found', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();

      populateDocumentSpy.mockResolvedValue({ error: 'Chat not found' });

      const response = await supertest(app).get(`/chat/${chatId}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Chat not found' });
    });

    it('should handle exceptions and return 500', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();

      populateDocumentSpy.mockRejectedValue(new Error('Database error'));

      const response = await supertest(app).get(`/chat/${chatId}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to retrieve chat' });
    });
  });

  describe('POST /chat/:chatId/participant', () => {
    it('should add a participant to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      const updatedChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addParticipantSpy.mockResolvedValue(updatedChat);
      populateDocumentSpy.mockResolvedValue(updatedChat);

      const response = await supertest(app).post(`/chat/${chatId}/participant`).send({ userId });

      expect(response.status).toBe(200);
      expect(addParticipantSpy).toHaveBeenCalledWith(chatId, userId);
    });

    it('should return 400 for invalid participant payload', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const invalidPayload = {};

      const response = await supertest(app).post(`/chat/${chatId}/participant`).send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid participant payload' });
      expect(addParticipantSpy).not.toHaveBeenCalled();
    });

    it('should return 500 when addParticipantToChat service fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      addParticipantSpy.mockResolvedValue({ error: 'Failed to add participant' });

      const response = await supertest(app).post(`/chat/${chatId}/participant`).send({ userId });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to add participant' });
    });

    it('should handle exceptions and return 500', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      addParticipantSpy.mockRejectedValue(new Error('Unexpected error'));

      const response = await supertest(app).post(`/chat/${chatId}/participant`).send({ userId });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to add participant' });
    });
  });

  describe('GET /chat/user/:username', () => {
    it('should return 200 with an array of chats', async () => {
      const username = 'user1';
      const chats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      getChatsByParticipantsSpy.mockResolvedValueOnce(chats);
      populateDocumentSpy.mockResolvedValueOnce(chats[0]);

      const response = await supertest(app).get(`/chat/user/${username}`);

      expect(getChatsByParticipantsSpy).toHaveBeenCalledWith([username]);
      expect(response.status).toBe(200);
    });

    it('should return 500 when getChatsByParticipants service fails', async () => {
      const username = 'user1';

      getChatsByParticipantsSpy.mockRejectedValue(new Error('Service error'));

      const response = await supertest(app).get(`/chat/user/${username}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch user chats' });
    });

    it('should return empty array when no chats found', async () => {
      const username = 'user1';

      getChatsByParticipantsSpy.mockResolvedValueOnce([]);

      const response = await supertest(app).get(`/chat/user/${username}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});