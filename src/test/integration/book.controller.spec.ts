import { bookRepository, userRepository } from '../../utils/initializeRepositories';
import { createUserTest, exampleBook } from '../utils';
import express, { Express } from 'express';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { clientRedis } from '../../utils/clientRedis';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { dataSource } from '../../configs/orm.config';

describe('BookController', () => {
    let server: Express;
    let container: StartedPostgreSqlContainer;

    beforeAll(async () => {
        jest.setTimeout(15000)
        const postgresContainer = new PostgreSqlContainer()
          .withDatabase('testdb')
          .withUsername('testuser')
          .withPassword('testpass');

        container = await postgresContainer.start();

        const app = express();
        server = app;

        await dataSource.setOptions({
            type: 'postgres',
            host: container.getHost(),
            port: container.getPort(),
            username: container.getUsername(),
            password: container.getPassword(),
            database: container.getDatabase(),
            synchronize: true,
            logging: false
        }).initialize();
    });

    afterAll(async () => {
        await clientRedis.disconnect();
    });

    describe('GET / - Get books on the main page', () => {
        it('should return books for the main page when user is authenticated', async () => {
            const user = await userRepository.save(createUserTest);
            exampleBook.user = user;
            await bookRepository.save(exampleBook);

            // token for test user
            const jwt = sign(createUserTest, process.env.SECRET_PHRASE_ACCESS_TOKEN as string);

            // request to server
            const response = await request(server)
              .get('/books/')
              .set('Authorization', `Bearer ${jwt}`);

            // expect
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('newBooks');
            expect(response.body).toHaveProperty('salesBooks');
            expect(response.body).toHaveProperty('bestsellerBooks');

            expect(response.body.newBooks).toEqual(
              expect.arrayContaining([
                  expect.objectContaining({
                      book: expect.objectContaining({
                          id: expect.any(Number),
                          title: exampleBook.title,
                          pagesQuantity: exampleBook.pagesQuantity,
                          summary: exampleBook.summary,
                          coverImageLink: exampleBook.coverImageLink,
                          originalPrice: exampleBook.originalPrice,
                          discountedPrice: exampleBook.discountedPrice,
                          language: expect.objectContaining({ id: exampleBook.language.id, name: exampleBook.language.name }),
                          isbn: exampleBook.isbn,
                          category: expect.objectContaining({ id: exampleBook.category.id, name: exampleBook.category.name }),
                          publicationYear: exampleBook.publicationYear,
                          publisher: expect.objectContaining({ id: exampleBook.publisher.id, name: exampleBook.publisher.name }),
                          authors: expect.arrayContaining([
                              expect.objectContaining({ id: exampleBook.authors[0].id }),
                          ]),
                          availableBooks: exampleBook.availableBooks,
                          genre: expect.objectContaining({ id: exampleBook.genre.id, name: exampleBook.genre.name }),
                          createdAt: expect.any(String),
                          updateAt: expect.any(String),
                          user: expect.objectContaining({
                              // username: exampleBook.user.username,
                              email: expect.any(String),
                              // password: exampleBook.user.password,
                              // role: exampleBook.user.role
                          })
                      }),
                      favorited: expect.any(Boolean),
                  }),
              ])
            );

            expect(response.body.salesBooks).toEqual(
              expect.arrayContaining([
                  expect.objectContaining({
                      book: expect.objectContaining({
                          id: expect.any(Number),
                          title: exampleBook.title,
                          pagesQuantity: exampleBook.pagesQuantity,
                          summary: exampleBook.summary,
                          coverImageLink: exampleBook.coverImageLink,
                          originalPrice: exampleBook.originalPrice,
                          discountedPrice: exampleBook.discountedPrice,
                          language: expect.objectContaining({ id: exampleBook.language.id, name: exampleBook.language.name }),
                          isbn: exampleBook.isbn,
                          category: expect.objectContaining({ id: exampleBook.category.id, name: exampleBook.category.name }),
                          publicationYear: exampleBook.publicationYear,
                          publisher: expect.objectContaining({ id: exampleBook.publisher.id, name: exampleBook.publisher.name }),
                          authors: expect.arrayContaining([
                              expect.objectContaining({ id: exampleBook.authors[0].id }),
                          ]),
                          availableBooks: exampleBook.availableBooks,
                          genre: expect.objectContaining({ id: exampleBook.genre.id, name: exampleBook.genre.name }),
                          createdAt: expect.any(String),
                          updateAt: expect.any(String),
                          user: expect.objectContaining({
                              // username: exampleBook.user.username,
                              email: expect.any(String),
                              // password: exampleBook.user.password,
                              // role: exampleBook.user.role
                          })
                      }),
                      favorited: expect.any(Boolean),
                  }),
              ])
            );

            expect(response.body.bestsellerBooks).toEqual(
              expect.arrayContaining([
                  expect.objectContaining({
                      book: expect.objectContaining({
                          id: expect.any(Number),
                          title: exampleBook.title,
                          pagesQuantity: exampleBook.pagesQuantity,
                          summary: exampleBook.summary,
                          coverImageLink: exampleBook.coverImageLink,
                          originalPrice: exampleBook.originalPrice,
                          discountedPrice: exampleBook.discountedPrice,
                          language: expect.objectContaining({ id: exampleBook.language.id, name: exampleBook.language.name }),
                          isbn: exampleBook.isbn,
                          category: expect.objectContaining({ id: exampleBook.category.id, name: exampleBook.category.name }),
                          publicationYear: exampleBook.publicationYear,
                          publisher: expect.objectContaining({ id: exampleBook.publisher.id, name: exampleBook.publisher.name }),
                          authors: expect.arrayContaining([
                              expect.objectContaining({ id: exampleBook.authors[0].id }),
                          ]),
                          availableBooks: exampleBook.availableBooks,
                          genre: expect.objectContaining({ id: exampleBook.genre.id, name: exampleBook.genre.name }),
                          createdAt: expect.any(String),
                          updateAt: expect.any(String),
                          user: expect.objectContaining({
                              // username: exampleBook.user.username,
                              email: expect.any(String),
                              // password: exampleBook.user.password,
                              // role: exampleBook.user.role
                          })
                      }),
                      favorited: expect.any(Boolean),
                  }),
              ])
            );
        });
    });

    describe('Redis Client Configuration', () => {
        it('should be configured with the correct host and port', () => {
            const expectedHost = process.env.REDIS_HOST || 'localhost';
            const expectedPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;

            expect(clientRedis.options.host).toBe(expectedHost);
            expect(clientRedis.options.port).toBe(expectedPort);
        });
    });

    describe('POST / - create book', () => {
        it('should return book', async () => {
            await bookRepository.clear()
            await bookRepository.save(exampleBook);
            const jwt = sign(createUserTest, process.env.SECRET_PHRASE_ACCESS_TOKEN as string);

            const userId = '123131';
            const image = {
                originalname: 'book1.jpg',
                buffer: Buffer.from('image data'),
                mimetype: 'image/jpeg',
                size: 123,
            };

            const response = await request(server)
              .post('/books/create')
              .set('Authorization', `Bearer ${jwt}`)
              .attach('file', image.buffer, image.originalname)
              .send({
                  exampleBook,
                  userId,
              })
              .expect(201);

            expect(response.body).toEqual(expect.objectContaining({
                id: expect.any(String),
                title: exampleBook.title,
                pagesQuantity: exampleBook.pagesQuantity,
                summary: exampleBook.summary,
                coverImageLink: expect.any(String),
                originalPrice: exampleBook.originalPrice,
                discountedPrice: exampleBook.discountedPrice,
                language: expect.objectContaining({ id: exampleBook.language.id, name: exampleBook.language.name }),
                isbn: exampleBook.isbn,
                category: expect.objectContaining({ id: exampleBook.category.id, name: exampleBook.category.name }),
                publicationYear: exampleBook.publicationYear,
                publisher: expect.objectContaining({ id: exampleBook.publisher.id, name: exampleBook.publisher.name }),
                authors: expect.arrayContaining([
                    expect.objectContaining({ id: exampleBook.authors[0].id }),
                ]),
                availableBooks: exampleBook.availableBooks,
                genre: expect.objectContaining({ id: exampleBook.genre.id, name: exampleBook.genre.name }),
                createdAt: expect.any(String),
                updateAt: expect.any(String),
                user: expect.objectContaining({
                    id: userId,
                    username: expect.any(String),
                    email: expect.any(String),
                    password: expect.any(String),
                    role: expect.any(String),
                })
            }))
        });

        it('should return error message when book title already exists', async () => {
            await bookRepository.save(exampleBook);

            const jwt = sign(createUserTest, process.env.SECRET_PHRASE_ACCESS_TOKEN as string);
            const userId = '123131';
            const image = {
                originalname: 'book1.jpg',
                buffer: Buffer.from('image data'),
                mimetype: 'image/jpeg',
                size: 123,
            };

            const response = await request(server)
              .post('/books/create')
              .set('Authorization', `Bearer ${jwt}`)
              .attach('file', image.buffer, image.originalname)
              .send({
                  exampleBook,
                  userId,
              })
              .expect(403);

            expect(response.body).toHaveProperty('message', 'Book title already exists, please select another one');
        });
    });
});
