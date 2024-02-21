import fs from 'fs';

export default class JsonCrud {
	// Private Attributes
	#filename = '';
	#schema = {};
	static #constants = {
		RUD_ALL: 1,
		RUD_REVERSE: 2
	};


	// Constructor
	constructor(filename) {
		this.#filename = filename;
		if (!fs.existsSync(this.#filename)) {
			fs.writeFileSync(this.#filename, JsonCrud.#toJson({}));
		}

		if (!JsonCrud.#isJsonCrudFormat(this.#in())) {
			throw new Error("Invalid JsonCrud format");
		}

		this.#migrateSchema();
	}


	// Static Methods
	static testValue(value, type) {
		if (typeof(value) === type) {
			return (value);
		}
		else {
			return (null);
		}
	}


	// Methods
	normalize() {
		const jsonData = this.#in();
		let newJsonData = {};

		for (const table in jsonData) {
			newJsonData[table] = [];
			const layout = this.jsonInterface[table];

			for (const unit of jsonData[table]) {
				const node = {};

				for (const key in layout) {
					node[key] = JsonCrud.testValue(unit[key], layout[key]);
				}
				newJsonData[table].push(node);
			}

		}
		this.#out(newJsonData);
	}

	create(table, src) {
		const jsonRaw = this.#in();

		const tableData = jsonRaw[table];

		if (!tableData) return null;

		tableData.data.push(JsonCrud.#insertData(src, tableData.schema, tableData.data));

		this.#out(jsonRaw);

		return (src);
	}

	read(table, key, value, options) {
		const jsonRaw = this.#in();

		const tableData = jsonRaw[table];

		if (!tableData) return null;

		for (const attrKey in tableData.schema) {
			if (tableData.schema[attrKey].uniqueKey) {
				key = key || attrKey;
				break ;
			}
		}
		
		if (!key) return null;

		const response = tableData.data.filter(
			(node) => {
				return (node[key] === value)
			}
		)

		if (options & JsonCrud.#constants.RUD_REVERSE) {
			response.reverse();
		}
		
		if (options & JsonCrud.#constants.RUD_ALL) {
			return (response);
		}
		return (response[0]);
	}

	update(table, key, value, src, options) {
		const jsonRaw = this.#in();

		const tableData = jsonRaw[table];

		if (!tableData) return null;

		for (const attrKey in tableData.schema) {
			if (tableData.schema[attrKey].uniqueKey) {
				key = key || attrKey;
				break ;
			}
		}
		
		if (!key) return null;

		const found = [];
		const rest = [];

		tableData.data.forEach(
			(node, idx) => {
				if (node[key] === value) {
					found.push(...tableData.data.slice(idx, idx + 1));
				}
				else {
					rest.push(...tableData.data.slice(idx, idx + 1));
				}
			}
		)

		tableData.data.splice(0);

		tableData.data = JsonCrud.#reincrement(tableData.schema, rest);

		if (options & JsonCrud.#constants.RUD_REVERSE) found.reverse();

		let response = [];

		if (options & JsonCrud.#constants.RUD_ALL) {
			response = found.splice(0);
		}
		else {
			response = found.splice(0, 1);
		}

		if (found.length) {
			if (options & JsonCrud.#constants.RUD_REVERSE) found.reverse();

			found.forEach(
				(node) => {
					tableData.data.push(JsonCrud.#insertData(node, tableData.schema, tableData.data));
				}
			)
		}

		response.forEach(
			(node) => {
				for (const attrKey in src) {
					node[attrKey] = src[attrKey];
				}
				tableData.data.push(JsonCrud.#insertData(node, tableData.schema, tableData.data));
			}
		)

		this.#out(jsonRaw);

		return (response);
	}

	delete(table, key, value, options) {
		const jsonRaw = this.#in();
		const tableData = jsonRaw[table];

		if (!tableData) return (null);

		for (const attrKey in tableData.schema) {
			if (tableData.schema[attrKey].uniqueKey) {
				key = key || attrKey;
				break ;
			}
		}
		
		if (!key) return null;

		const response = [];
		const found = [];

		tableData.data.forEach(
			(node, idx) => {
				if (node[key] === value) {
					found.push(idx);
				}
			}
		)

		if (options & JsonCrud.#constants.RUD_ALL) {
			found.reverse();
			found.forEach(
				(idx) => {
					response.push(...tableData.data.splice(idx, 1));
				}
			)
		}
		else {
			if (options & JsonCrud.#constants.RUD_REVERSE) found.reverse();

			response.push(tableData.data.splice(found[0], 1));
		}

		tableData.data = JsonCrud.#reincrement(tableData.schema, tableData.data);

		this.#out(jsonRaw);

		return (response);
	}

	tableCreate(name, schema, data) {
		if (!name || !schema) return null;

		const jsonRaw = this.#in();

		if (jsonRaw[name]) return jsonRaw[name];

		jsonRaw[name] = {};

		jsonRaw[name].schema = JsonCrud.#generateSchema(schema);

		jsonRaw[name].data = JsonCrud.#generateData(jsonRaw[name].schema, data);

		this.#schema[name] = jsonRaw[name].schema;

		this.#out(jsonRaw);

		return (jsonRaw[name])
	}

	tableRead(id) {
		if (!id) return (null);

		const table = this.#in()[id];

		return (table || null);
	}

	tableUpdate(id, name, schema, data) {
		if (!id) return null;

		const jsonRaw = this.#in();
		const slice = jsonRaw[id];
		
		if (!slice) return null;
		
		const newTable = {};

		newTable.schema = JsonCrud.#generateSchema(schema || slice.schema);

		newTable.data = JsonCrud.#generateData(newTable.schema, data || slice.data)

		delete jsonRaw[id];

		jsonRaw[name || id] = newTable;

		delete this.#schema[id];
		this.#schema[name || id] = newTable.schema;

		this.#out(jsonRaw);

		return (newTable);
	}

	tableDelete(id) {
		if (!id) return null;

		const jsonRaw = this.#in();

		const slice = jsonRaw[id] || null;
		delete jsonRaw[id];

		delete this.#schema[id];

		this.#out(jsonRaw);

		return slice;
	}

	// Getter * Setter
	get filename() {
		return (this.#filename);
	}

	get constants() {
		return (JsonCrud.#constants);
	}

	get schema() {
		return (this.#schema);
	}

	// Static Private Method
	static #toJson(jsData) {
		return (JSON.stringify(jsData, null, "\t"));
	}

	static #toJs(jsonData) {
		return (JSON.parse(jsonData));
	}

	static #isJsonCrudFormat(jsonRaw) {
		for (const table in jsonRaw) {
			const jsTable = jsonRaw[table];

			if (typeof(jsTable) !== 'object') return (false);
			if ((typeof(jsTable.schema) !== 'object') || (typeof(jsTable.data) !== 'object')) return (false);
		}
		return (true);
	}

	static #generateSchema(schemaData) {
		const schema = {}
		let primaryKey = 0;

		for (const attrKey in schemaData) {
			const attr = schemaData[attrKey];

			schema[attrKey] = {
				type: attr.type || 'string',
				notNull: attr.notNull || false,
				primaryKey: attr.primaryKey || false,
				uniqueKey: attr.uniqueKey || false,
				autoIncrement: attr.autoIncrement || false
			};

			if (schema[attrKey].primaryKey) {
				if (primaryKey) throw new Error("Only one attribute can have primary key feature");
				primaryKey++;
			}

			if (attr.default) {
				schema[attrKey].default = attr.default;
			}
			else {
				schema[attrKey].default = null;
			}
			if (attr.notNull) schema[attrKey].default = undefined;

			if (attr.autoIncrement) {
				schema[attrKey].type = 'number';
				schema[attrKey].default = 0;
				schema[attrKey].notNull = false;
				schema[attrKey].uniqueKey = true;
			}
		}

		return (schema);
	}

	static #generateData(schemaSrc, dataSrc) {
		const data = [];

		for (const idx in dataSrc) {
			data.push(JsonCrud.#insertData(dataSrc[idx], schemaSrc, data));
		}

		return (data);
	}

	static #insertData(data, schema, arr) {
		const response = JsonCrud.#normalize(schema, data);

		for (const attrKey in schema) {
			const attr = schema[attrKey];
			if (attr.autoIncrement) {
				response[attrKey] = arr.length
			}
			else {
				if (typeof(response[attrKey]) !== attr.type) response[attrKey] = attr.default;
	
				if (attr.notNull && !response[attrKey]) throw new Error(`Needed attribute ${attrKey} is null`);

				if (attr.uniqueKey) {
					arr.forEach(
						(elem) => {
							if (response[attrKey] && (response[attrKey] === elem[attrKey])) throw new Error(`Atributte ${attrKey} with same value (${response[attrKey]} === ${elem[attrKey]})`);
						}
					)
				}
			}
		} 

		return (response);
	}

	static #normalize(schema, data) {
		const response = {}

		for (const key in schema) {
			response[key] = data[key] || schema[key].default;
		}

		return (response);
	}

	static #reincrement(schema, data) {
		const inAttr = [];

		for (const key in schema) {
			if (schema[key].autoIncrement) inAttr.push(key);
		}
		
		inAttr.forEach(
			(attr, index) => {
				data.forEach(
					(node) => {
						node[attr] = index;
					}
				)
			}
		)

		return (data);
	}


	// Private Method
	#in() {
		this.#accessFile();
		const fileContent = fs.readFileSync(this.#filename, 'utf-8');
		return (JsonCrud.#toJs(fileContent));
	}

	#out(data) {
		this.#accessFile();
		const fileContent = JsonCrud.#toJson(data);
		fs.writeFileSync(this.#filename, fileContent);
	}

	#accessFile() {
		fs.accessSync(this.#filename, fs.constants.F_OK | fs.constants.W_OK | fs.constants.R_OK)		
	}

	#migrateSchema() {
		const jsonData = this.#in();

		for (const table in jsonData) {
			this.#schema[table] = {
				...(jsonData[table].schema)
			}
		}
	}
}