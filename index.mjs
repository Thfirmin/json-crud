import fs from 'fs';
import JsonCrud from "./JsonCrud.mjs"

const jsonCrud = new JsonCrud('user.json');

jsonCrud.tableCreate(
	"user",
	{
		id: {
			primaryKey: true,
			autoIncrement: true
		},
		username: {
			uniqueKey: true,
			notNull: true
		},
		password: {
			notNull: true
		},
		email: {
			uniqueKey: true
		},
		cpf: {
		}
	}
)

// jsonCrud.create(
// 	"user",
// 	{
// 		username: "thino",
// 		password: "123",
// 		email: "thino@gmail.com"
// 	}
// )

jsonCrud.delete(
	"user",
	"username",
	"thino"
)