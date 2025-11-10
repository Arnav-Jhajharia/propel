# 🚀 How to Run the Agent Rental Dashboard

## Quick Start (One Command)

```bash
cd frontend
./start-all.sh
```

This will:
- Install dependencies
- Set up the database
- Seed with sample data
- Start the development server

## Manual Setup

### 1. **Install Dependencies**
```bash
cd frontend
npm install
```

### 2. **Set Up Database**
```bash
# Push database schema
npm run db:push

# Seed with sample data
npm run db:seed
```

### 3. **Start Development Server**
```bash
npm run dev
```

## 🌐 Access Points

Once running, you can access:

- **Frontend Dashboard**: http://localhost:3000
- **Login Page**: http://localhost:3000/login
- **Database Studio**: https://local.drizzle.studio

## 🔐 Default Credentials

- **Email**: `agent@example.com`
- **Password**: `password123`

Or create a new account at the login page.

## 📊 Database Management

### View Database
```bash
npm run db:studio
```
Opens Drizzle Studio at https://local.drizzle.studio

### Reset Database
```bash
rm local.db
npm run db:push
npm run db:seed
```

### Database Commands
```bash
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes
npm run db:seed      # Seed with sample data
```

## 🧪 Testing APIs

### Test Authentication
```bash
./test-simple-auth.sh
```

### Test All APIs
```bash
./test-apis-with-auth.sh
```

## 🛠️ Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── login/          # Login page
│   │   └── page.tsx        # Dashboard
│   ├── components/         # React components
│   ├── lib/               # Utilities
│   │   ├── db/            # Database setup
│   │   └── simple-auth.ts # Authentication
│   └── middleware.ts       # Auth middleware
├── local.db               # SQLite database
├── drizzle/              # Database migrations
└── package.json          # Dependencies
```

## 🔧 Troubleshooting

### Port Already in Use
If port 3000 is busy, Next.js will automatically use 3001.

### Database Issues
```bash
# Reset database
rm local.db
npm run db:push
npm run db:seed
```

### Authentication Issues
- Clear browser cookies
- Check browser console for errors
- Verify API routes are working with curl

### Dependencies Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## 🚀 Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm run start
   ```

3. **Set environment variables**:
   ```bash
   export BETTER_AUTH_SECRET="your-secret-key"
   export DATABASE_URL="your-database-url"
   ```

## 📝 Environment Variables

Create `.env.local` file:
```env
BETTER_AUTH_SECRET=your-secret-key
DATABASE_URL=file:./local.db
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🎯 Next Steps

1. **Visit the login page**: http://localhost:3000/login
2. **Sign in or create account**
3. **Explore the dashboard**
4. **View database**: https://local.drizzle.studio
5. **Test APIs**: Use the provided test scripts

## 📞 Support

If you encounter issues:
1. Check the terminal for error messages
2. Verify all dependencies are installed
3. Ensure the database is properly set up
4. Check browser console for client-side errors


