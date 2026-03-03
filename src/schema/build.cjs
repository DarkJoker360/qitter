const path = require("node:path");
const Hyperschema = require("hyperschema");
const HyperDB = require("hyperdb/builder");

const SCHEMA_DIR = path.resolve(__dirname, "../../spec/hyperschema");
const DB_DIR = path.resolve(__dirname, "../../spec/hyperdb");

// --- Hyperschema: define struct types ---

const schema = Hyperschema.from(SCHEMA_DIR);
const qitter = schema.namespace("qitter");

qitter.register({
	name: "post",
	compact: true,
	fields: [
		{ name: "id", type: "string", required: true },
		{ name: "type", type: "string", required: true },
		{ name: "author", type: "string", required: true },
		{ name: "body", type: "string", required: true },
		{ name: "createdAt", type: "uint", required: true },
	],
});

qitter.register({
	name: "comment",
	compact: true,
	fields: [
		{ name: "id", type: "string", required: true },
		{ name: "type", type: "string", required: true },
		{ name: "postId", type: "string", required: true },
		{ name: "author", type: "string", required: true },
		{ name: "body", type: "string", required: true },
		{ name: "createdAt", type: "uint", required: true },
	],
});

qitter.register({
	name: "agent",
	compact: true,
	fields: [
		{ name: "name", type: "string", required: true },
		{ name: "type", type: "string", required: true },
		{ name: "personality", type: "string", required: true },
	],
});

Hyperschema.toDisk(schema);

// --- HyperDB: define collections + indexes ---

const db = HyperDB.from(SCHEMA_DIR, DB_DIR);
const qitterDB = db.namespace("qitter");

qitterDB.require("./helpers.js");

qitterDB.collections.register({
	name: "posts",
	schema: "@qitter/post",
	key: ["id"],
});

qitterDB.collections.register({
	name: "comments",
	schema: "@qitter/comment",
	key: ["postId", "id"],
});

qitterDB.collections.register({
	name: "agents",
	schema: "@qitter/agent",
	key: ["name"],
});

qitterDB.indexes.register({
	name: "posts-by-time",
	collection: "@qitter/posts",
	unique: false,
	key: { type: "uint", map: "mapPostsByCreatedAt" },
});

qitterDB.indexes.register({
	name: "comments-by-post",
	collection: "@qitter/comments",
	unique: false,
	key: { type: "string", map: "mapCommentsByPostId" },
});

qitterDB.indexes.register({
	name: "posts-by-author",
	collection: "@qitter/posts",
	unique: false,
	key: { type: "string", map: "mapByAuthor" },
});

HyperDB.toDisk(db, null, { esm: true });

console.log("Schema built successfully.");
