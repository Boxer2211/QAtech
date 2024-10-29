import {
    authorRepository,
    bookRepository,
    categoryRepository, genreRepository,
    languageRepository, publisherRepository,
    userRepository,
} from '../../utils/initializeRepositories';
import { createUserAdminTest, createUserTest, exampleBook } from '../utils';
import express, { Express } from 'express';
import jwt, { sign } from 'jsonwebtoken';
import request from 'supertest';
import { clientRedis } from '../../utils/clientRedis';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { dataSource } from '../../configs/orm.config';
import bookRoute from '../../routes/book.route';

describe('BookController', () => {
    let server: Express;
    let container: StartedPostgreSqlContainer;

    beforeAll(async () => {
        jest.mock('aws-sdk', () => {
            const mS3 = {
                upload: jest.fn().mockReturnValue({
                    promise: jest.fn().mockResolvedValue({ Location: 'mocked_image_link' }),
                }),
            };
            return {
                S3: jest.fn(() => mS3),
            };
        });

        // jest.resetModules();
        // jest.mock('aws-sdk', () => {
        //     const mS3 = {
        //         upload: jest.fn().mockReturnValue({
        //             promise: jest.fn().mockResolvedValue({ Location: 'mocked_image_link' }),
        //         }),
        //         getObject: jest.fn().mockReturnValue({
        //             promise: jest.fn().mockResolvedValue({ Body: 'mocked_file_content' }),
        //         }),
        //     };
        //     return { S3: jest.fn(() => ({
        //             ...mS3,
        //             config: { region: 'us-east-1' }
        //         })) };
        // });
        // jest.mock('../../services/s3Service', () => ({
        //     uploadImage: jest.fn(() => Promise.resolve('mocked_image_link')),
        // }));
        const postgresContainer = new PostgreSqlContainer()
          .withDatabase('testdb')
          .withUsername('testuser')
          .withPassword('testpass');

        container = await postgresContainer.start();

        const app = express();
        app.use('/books', bookRoute)
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
        }).initialize()
    });

    afterAll(async () => {
        await clientRedis.disconnect();
    });

    describe('GET / - Get books on the main page', () => {
        it('should return books for the main page when user is authenticated', async () => {
            const user = await userRepository.save(createUserTest);
            exampleBook.user = user;
            await languageRepository.save({ id: 1, name: 'Ukrainian' });
            await categoryRepository.save({ id: 1, name: 'Ukrainian' });
            await publisherRepository.save({ id: 1, name: 'MGT' });
            await genreRepository.save({ id: 1, name: 'Fantasy' });
            await authorRepository.save([{ id: 1, fullName: 'Maus Pol' }]);
            await bookRepository.save(exampleBook);

            // token for test user
            const token = jwt.sign(createUserTest, process.env.SECRET_PHRASE_ACCESS_TOKEN);

            // request to server
            const response = await request(server)
              .get('/books/')
              .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('newBooks');
            expect(response.body).toHaveProperty('salesBooks');
            expect(response.body).toHaveProperty('bestsellerBooks');

            // Функція для перевірки структури книги
            const checkBookStructure = (book) => {
                expect(book).toEqual(
                  expect.objectContaining({
                      book: expect.objectContaining({
                          id: expect.any(String),
                          title: exampleBook.title,
                          pagesQuantity: exampleBook.pagesQuantity,
                          summary: exampleBook.summary,
                          coverImageLink: exampleBook.coverImageLink,
                          originalPrice: exampleBook.originalPrice.toString(),
                          discountedPrice: exampleBook.discountedPrice.toString(),
                          isbn: exampleBook.isbn,
                          availableBooks: exampleBook.availableBooks,
                          publicationYear: exampleBook.publicationYear,
                          createdAt: expect.any(String),
                          updateAt: expect.any(String),

                          // Додано нові поля
                          favoritesCount: expect.any(Number),
                          salesCount: expect.any(Number),

                          // Видалено вкладені об'єкти, які відсутні у відповіді
                          authors: expect.arrayContaining([
                              expect.objectContaining({ id: 1, fullName: 'Maus Pol' }),
                          ]),
                      }),
                      favorited: expect.any(Boolean),
                  })
                );
            };

            // Перевірка кожної категорії книг
            response.body.newBooks.forEach(checkBookStructure);
            response.body.salesBooks.forEach(checkBookStructure);
            response.body.bestsellerBooks.forEach(checkBookStructure);
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

            const createMockImageBuffer = (width, height, color) => {
                const buffer = Buffer.alloc(width * height * 4);
                const rgba = color === 'white' ? [255, 255, 255, 255] : [0, 0, 0, 255]; // RGBA
                for (let i = 0; i < buffer.length; i += 4) {
                    buffer.writeUInt8(rgba[0], i);
                    buffer.writeUInt8(rgba[1], i + 1);
                    buffer.writeUInt8(rgba[2], i + 2);
                    buffer.writeUInt8(rgba[3], i + 3);
                }
                return buffer;
            };

            const imageBuffer = createMockImageBuffer(1, 1, 'white'); // 1x1 біле зображення
            const image = {
                originalname: 'mock_image.png',
                buffer: imageBuffer,
                mimetype: 'image/png',
                size: imageBuffer.length,
            };

            await bookRepository.delete({})
            await userRepository.delete({})
            const user = await userRepository.save(createUserAdminTest);
            exampleBook.user = user;
            // await bookRepository.save(exampleBook);
            const token = jwt.sign(createUserAdminTest, process.env.SECRET_PHRASE_ACCESS_TOKEN as string);

            const response = await request(server)
              .post('/books/create')
              .set('Authorization', `Bearer ${token}`)
              .attach('image', imageBuffer, image.originalname)
              .field('title', exampleBook.title)
              .field('pagesQuantity', exampleBook.pagesQuantity)
              .field('summary', exampleBook.summary)
              .field('originalPrice', exampleBook.originalPrice)
              .field('discountedPrice', exampleBook.discountedPrice)
              .field('language', JSON.stringify(exampleBook.language))
              .field('isbn', exampleBook.isbn)
              .field('category', JSON.stringify(exampleBook.category))
              .field('publicationYear', exampleBook.publicationYear)
              .field('publisher', JSON.stringify(exampleBook.publisher))
              .field('authors', JSON.stringify(exampleBook.authors))
              .field('availableBooks', exampleBook.availableBooks)
              .field('genre', JSON.stringify(exampleBook.genre))
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
                    expect.objectContaining({ id: exampleBook.authors[0].id, fullName: exampleBook.authors[0].fullName }),
                ]),
                availableBooks: exampleBook.availableBooks,
                genre: expect.objectContaining({ id: exampleBook.genre.id, name: exampleBook.genre.name }),
                createdAt: expect.any(String),
                updateAt: expect.any(String),
                user: expect.objectContaining({
                    id: expect.any(String),
                    username: expect.any(String),
                    email: expect.any(String),
                    password: expect.any(String),
                    role: expect.any(String),
                })
            }))
        });

        it('should return error message when book title already exists', async () => {
            const user = await userRepository.save(createUserAdminTest);
            exampleBook.user = user;
            await languageRepository.save({ id: 1, name: 'Ukrainian' });
            await categoryRepository.save({ id: 1, name: 'Ukrainian' });
            await publisherRepository.save({ id: 1, name: 'MGT' });
            await genreRepository.save({ id: 1, name: 'Fantasy' });
            await authorRepository.save([{ id: 1, fullName: 'Maus Pol' }]);
            await bookRepository.save(exampleBook);
            const token = jwt.sign(createUserAdminTest, process.env.SECRET_PHRASE_ACCESS_TOKEN as string);

            const image = {
                originalname: 'book1.jpg',
                buffer: Buffer.from('image data'),
                mimetype: 'image/jpeg',
                size: 123,
            };

            const response = await request(server)
              .post('/books/create')
              .set('Authorization', `Bearer ${token}`)
              .attach('file', image.buffer, image.originalname)
              .field('exampleBook', JSON.stringify(exampleBook))
              .field('userId', user.id)
              .expect(403);

            expect(response.body).toHaveProperty('message', 'Book title already exists, please select another one');
        });
    });
});
