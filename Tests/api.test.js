const request = require("supertest");
const { ObjectId } = require("mongodb");
const app = require("../server");

describe("Swatch API Tests", () => {

  const testUser = {
    email: "testuser789@gmail.com",
    password: "password123",
    username: "testuser789",
    firstname: "Test",
    lastname: "User"
  };

  const testBusinessUser = {
    email: "business789@test.com",
    password: "password123",
    businessName: "Test Business 789",
    username: "testbusiness789"
  };

  let userToken;
  let businessUserId;
  let polishIds = [];

  // Setup: Register users, get tokens, and create mock polish IDs
  beforeAll(async () => {
    // Create test user
    const userSignupRes = await request(app)
      .post("/signup")
      .send(testUser);

    // Create business user (isBusiness: true)
    const businessUserSignup = await request(app)
      .post("/signup")
      .send({
        email: testBusinessUser.email,
        password: testBusinessUser.password,
        username: testBusinessUser.username,
        firstname: "Business",
        lastname: "Account",
        isBusiness: true
      });

    businessUserId = businessUserSignup.body.userId;
    console.log("Business User ID:", businessUserId);
    console.log("Business User Signup Response:", businessUserSignup.body);

    // Login user
    const userLogin = await request(app)
      .post("/login")
      .send({
        emailOrUsername: testUser.username,
        password: testUser.password
      });
    userToken = userLogin.body.token;

    // Create mock polish IDs (using ObjectId format)
    polishIds = [
      new ObjectId().toString(),
      new ObjectId().toString(),
      new ObjectId().toString()
    ];
  });

  // ============ AUTHENTICATION TESTS ============
  
  test("POST /signup should register a user with all required fields", async () => {
    const newUser = {
      email: `newuser${Date.now()}@test.com`,
      password: "password123",
      username: `newuser${Date.now()}`,
      firstname: "New",
      lastname: "User"
    };

    const res = await request(app)
      .post("/signup")
      .send(newUser);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User registered successfully");
  });

  test("POST /login should return token for valid credentials", async () => {
    const res = await request(app)
      .post("/login")
      .send({
        emailOrUsername: testUser.username,
        password: testUser.password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
  });

  // ============ UNIT TESTS - POST OBJECT CREATION ============

  describe("POST Object Creation - Unit Tests", () => {

    test("Should create a post object with caption, photoUri, and userId", async () => {
      const postPayload = {
        caption: "Beautiful nail polish collection",
        photoUri: "https://example.com/photo.jpg",
        polishIds: polishIds.slice(0, 2),
        businessId: businessUserId
      };

      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send(postPayload);

      if (res.statusCode !== 200) {
        console.error("Post creation error:", res.body);
      }

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("_id");
      expect(res.body).toHaveProperty("userId");
      expect(res.body).toHaveProperty("username");
      expect(res.body.caption).toBe(postPayload.caption);
      expect(res.body.photoUri).toBe(postPayload.photoUri);
      expect(res.body.createdAt).toBeDefined();
    });

    test("Should correctly link tagged polish IDs to a post", async () => {
      const postPayload = {
        caption: "Multiple polish colors",
        polishIds: polishIds,
        businessId: businessUserId,
        photoUri: "https://example.com/multi-polish.jpg"
      };

      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send(postPayload);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.polishIds)).toBe(true);
      expect(res.body.polishIds.length).toBeGreaterThan(0);
    });

    test("Should validate that caption is required", async () => {
      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          polishIds: polishIds.slice(0, 1),
          businessId: businessUserId,
          photoUri: "https://example.com/photo.jpg"
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Missing required fields");
    });

    test("Should validate that polishIds is required", async () => {
      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "Test caption",
          businessId: businessUserId,
          photoUri: "https://example.com/photo.jpg"
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Missing required fields");
    });

    test("Should validate that businessId is required", async () => {
      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "Test caption",
          polishIds: polishIds.slice(0, 1),
          photoUri: "https://example.com/photo.jpg"
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Missing required fields");
    });

    test("Should validate that polishIds is an array when provided as string", async () => {
      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "Test caption",
          polishIds: "not-an-array",
          businessId: businessUserId
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("polishIds must be an array");
    });

    test("Should validate that polishIds array is not empty", async () => {
      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "Test caption",
          polishIds: [],
          businessId: businessUserId
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("At least one polish ID is required");
    });

    test("Should validate ObjectId format for polishIds", async () => {
      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "Test caption",
          polishIds: ["invalid-id-format"],
          businessId: businessUserId
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Invalid polishId format");
    });

    test("Should validate ObjectId format for businessId", async () => {
      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "Test caption",
          polishIds: polishIds.slice(0, 1),
          businessId: "invalid-business-id"
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Invalid businessId format");
    });
  });

  // ============ INTEGRATION TESTS - POST API ============

  describe("POST Integration Tests", () => {

    test("POST /posts should successfully create a post through the API", async () => {
      const postPayload = {
        caption: "Integration test post",
        polishIds: polishIds.slice(0, 1),
        businessId: businessUserId,
        photoUri: "https://example.com/test.jpg"
      };

      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send(postPayload);

      expect(res.statusCode).toBe(200);
      expect(res.body.caption).toBe(postPayload.caption);
      expect(res.body.username).toBe(testUser.username);
      expect(res.body.userId).toBeDefined();
    });

    test("GET /posts should retrieve posts from the database", async () => {
      // Create at least one post
      await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "Feed test post",
          polishIds: polishIds.slice(0, 1),
          businessId: businessUserId
        });

      const res = await request(app)
        .get("/posts")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("okay");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test("GET /posts should return posts sorted by creation date (newest first)", async () => {
      // Get initial posts
      const initialRes = await request(app)
        .get("/posts")
        .set("Authorization", `Bearer ${userToken}`);

      const initialLength = initialRes.body.data.length;

      // Create multiple posts with delays
      await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "First post",
          polishIds: [polishIds[0]],
          businessId: businessUserId
        });

      await new Promise(resolve => setTimeout(resolve, 100));

      await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "Second post (newer)",
          polishIds: [polishIds[1]],
          businessId: businessUserId
        });

      const res = await request(app)
        .get("/posts")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeTruthy();

      // Check that posts are sorted by createdAt in descending order
      for (let i = 0; i < res.body.data.length - 1; i++) {
        const current = new Date(res.body.data[i].createdAt);
        const next = new Date(res.body.data[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    test("GET /posts should include correct username for each post", async () => {
      const createRes = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "Username test post",
          polishIds: [polishIds[0]],
          businessId: businessUserId
        });

      const feedRes = await request(app)
        .get("/posts")
        .set("Authorization", `Bearer ${userToken}`);

      expect(feedRes.statusCode).toBe(200);
      
      const createdPost = feedRes.body.data.find(p => p._id === createRes.body._id.toString());
      expect(createdPost).toBeDefined();
      expect(createdPost.username).toBe(testUser.username);
    });

    test("DELETE /posts/:id should successfully delete a post", async () => {
      // Create a post
      const createRes = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          caption: "Post to delete",
          polishIds: [polishIds[0]],
          businessId: businessUserId
        });

      const postId = createRes.body._id;

      // Delete the post
      const deleteRes = await request(app)
        .delete(`/posts/${postId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.status).toBe("okay");
      expect(deleteRes.body.message).toContain("deleted successfully");
    });

    test("DELETE /posts/:id should return 404 for non-existent post", async () => {
      const fakePostId = new ObjectId();

      const res = await request(app)
        .delete(`/posts/${fakePostId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain("Post not found");
    });

    test("DELETE /posts/:id should return 403 without authorization token", async () => {
      const fakePostId = new ObjectId();

      const res = await request(app)
        .delete(`/posts/${fakePostId}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain("No token provided");
    });

    test("POST /posts should return 403 without authorization token", async () => {
      const res = await request(app)
        .post("/posts")
        .send({
          caption: "Unauthorized post",
          polishIds: [polishIds[0]],
          businessId: businessUserId
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain("No token provided");
    });

    test("GET /posts should return 403 without authorization token", async () => {
      const res = await request(app)
        .get("/posts");

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain("No token provided");
    });
  });

});
