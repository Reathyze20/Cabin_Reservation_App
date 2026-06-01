# Learning Documentation

Professional guides for learning API testing and browser automation with this application.

## 📖 Guides

### [GETTING-STARTED.md](GETTING-STARTED.md)
**15-minute quick start** — Get the application running and verify everything works.

**For:** Complete beginners  
**You'll learn:** How to start the app, create test admin, verify login, check backend health

---

### [POSTMAN-GUIDE.md](POSTMAN-GUIDE.md)
**Complete API testing guide** — Learn to test REST APIs using Postman.

**For:** Beginners in API testing  
**Time:** 2-4 hours  
**You'll learn:** 
- Import and use Postman collections
- Understand HTTP methods, headers, and authentication
- Test all major API endpoints
- Write tests and assertions
- Use variables and environments

---

### [PLAYWRIGHT-GUIDE.md](PLAYWRIGHT-GUIDE.md)
**Complete browser automation guide** — Learn to automate browser testing with Playwright.

**For:** Beginners in browser automation  
**Time:** 4-8 hours  
**Prerequisites:** Recommended to complete Postman guide first  
**You'll learn:**
- Set up Playwright from scratch
- Write automated browser tests
- Use selectors effectively
- Create login helpers and fixtures
- Debug and troubleshoot tests

---

### [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md)
**Development roadmap** — Track what's ready for learning and what still needs implementation.

**For:** Both learners and developers  
**Use this to:**
- See what's production-ready vs. in-progress
- Understand known limitations
- Check if issues you encounter are expected gaps
- Plan future improvements

---

## 🎯 Recommended Learning Path

1. **Start here:** [GETTING-STARTED.md](GETTING-STARTED.md)
   - Get the application running
   - Create your test admin account
   - Verify everything works

2. **Then:** [POSTMAN-GUIDE.md](POSTMAN-GUIDE.md)
   - Start with Postman (easier, no code required)
   - Complete all exercises
   - Build confidence with APIs

3. **Finally:** [PLAYWRIGHT-GUIDE.md](PLAYWRIGHT-GUIDE.md)
   - Move to browser automation
   - Apply knowledge from Postman
   - Write comprehensive test suites

---

## 🔧 Quick Reference

### Application URLs
- **Frontend:** http://localhost:5173
- **Backend Health:** http://localhost:3000/api/health
- **Swagger Docs:** http://localhost:3000/api/docs

### Test Credentials
- **Username:** `admin`
- **Password:** `tajneheslo123`
- **Create account:** `npm run create-learning-admin`

### Key Commands
```bash
npm run dev                    # Start application
npm run create-learning-admin  # Create test admin
npm run preflight:deploy       # Validate before deployment
```

---

## 📚 Additional Resources

### In This Repo
- [API Quickstart](../API-QUICKSTART.md) — API endpoint reference
- [Playwright Readiness Checklist](../PLAYWRIGHT-READINESS-CHECKLIST.md) — Complete selector inventory
- [Playwright Starter Guide](../PLAYWRIGHT-STARTER-GUIDE.md) — App structure for testers
- [Sprint 0 Smoke Test](../SPRINT-0-SMOKE-TEST.md) — Manual testing scenarios

### External
- [Postman Learning Center](https://learning.postman.com/)
- [Playwright Documentation](https://playwright.dev/)
- [HTTP Status Codes](https://httpstatuses.com/)

---

## 💡 Tips for Success

1. **Start slow:** Don't rush through the guides
2. **Experiment:** Try things that aren't in the guides
3. **Break things:** You can't hurt the local dev environment
4. **Ask questions:** Check the troubleshooting sections
5. **Track progress:** Use the roadmap to see what's next

---

**Happy learning! 🎉**
