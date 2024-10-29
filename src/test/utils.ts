export const createUserAdminTest = {
    username: 'Nikita',
    email: process.env.TEST_EMAIL_ADMIN,
    password: '1',
    role: 'admin',
};

export const createUserTest = {
    username: 'Slava',
    email: process.env.TEST_EMAIL,
    password: '2',
    role: 'user',
};

export const bookAttributes = {
    language: 'Ukrainian',
    category: 'Fiction',
    genre: 'Fantasy',
    authors: 'Maus Pol',
    publisher: 'MGT',
};

export const exampleBook = {
    title: 'example-book-title',
    pagesQuantity: 350,
    summary: 'This is an example summary of the book.',
    coverImageLink: 'link',
    originalPrice: 29.99,
    discountedPrice: 19.99,
    language: { id: 1, name: bookAttributes.language },
    isbn: '978-3-16-148410-0',
    category: { id: 1, name: bookAttributes.language },
    publicationYear: 2023,
    publisher: { id: 1, name: bookAttributes.publisher },
    authors: [{ id: 1, fullName: bookAttributes.authors }],
    availableBooks: 100,
    genre: { id: 1, name: bookAttributes.genre },
    user: {},
};
