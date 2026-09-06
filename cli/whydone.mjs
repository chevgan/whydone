#!/usr/bin/env node
import { createRequire } from "node:module";
import { parseArgs, stripVTControlCharacters, styleText } from "node:util";
import { fileURLToPath } from "node:url";
import path, { dirname, join } from "node:path";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import fs, { access, copyFile, mkdir, readFile, readdir, rm, rmdir, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import * as nativeFs from "fs";
import { readdir as readdir$1, readdirSync as readdirSync$1, realpath, realpathSync as realpathSync$1, stat, statSync as statSync$1 } from "fs";
import { basename, dirname as dirname$1, isAbsolute, normalize, posix, relative, resolve, sep } from "path";
import { fileURLToPath as fileURLToPath$1 } from "url";
import { createRequire as createRequire$1 } from "module";
import process$1, { stdin, stdout } from "node:process";
import * as l from "node:readline";
import l__default from "node:readline";
import { ReadStream } from "node:tty";
import { createHash } from "node:crypto";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region node_modules/citty/dist/_chunks/libs/scule.mjs
function isUppercase(char = "") {
	if (NUMBER_CHAR_RE.test(char)) return;
	return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
	const splitters = separators ?? STR_SPLITTERS;
	const parts = [];
	if (!str || typeof str !== "string") return parts;
	let buff = "";
	let previousUpper;
	let previousSplitter;
	for (const char of str) {
		const isSplitter = splitters.includes(char);
		if (isSplitter === true) {
			parts.push(buff);
			buff = "";
			previousUpper = void 0;
			continue;
		}
		const isUpper = isUppercase(char);
		if (previousSplitter === false) {
			if (previousUpper === false && isUpper === true) {
				parts.push(buff);
				buff = char;
				previousUpper = isUpper;
				continue;
			}
			if (previousUpper === true && isUpper === false && buff.length > 1) {
				const lastChar = buff.at(-1);
				parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
				buff = lastChar + char;
				previousUpper = isUpper;
				continue;
			}
		}
		buff += char;
		previousUpper = isUpper;
		previousSplitter = isSplitter;
	}
	parts.push(buff);
	return parts;
}
function upperFirst(str) {
	return str ? str[0].toUpperCase() + str.slice(1) : "";
}
function lowerFirst(str) {
	return str ? str[0].toLowerCase() + str.slice(1) : "";
}
function pascalCase(str, opts) {
	return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => upperFirst(opts?.normalize ? p.toLowerCase() : p)).join("") : "";
}
function camelCase(str, opts) {
	return lowerFirst(pascalCase(str || "", opts));
}
function kebabCase(str, joiner) {
	return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner ?? "-") : "";
}
function snakeCase(str) {
	return kebabCase(str || "", "_");
}
var NUMBER_CHAR_RE, STR_SPLITTERS;
var init_scule = __esmMin((() => {
	NUMBER_CHAR_RE = /\d/;
	STR_SPLITTERS = [
		"-",
		"_",
		"/",
		"."
	];
}));
//#endregion
//#region node_modules/citty/dist/index.mjs
function toArray(val) {
	if (Array.isArray(val)) return val;
	return val === void 0 ? [] : [val];
}
function formatLineColumns(lines, linePrefix = "") {
	const maxLength = [];
	for (const line of lines) for (const [i, element] of line.entries()) maxLength[i] = Math.max(maxLength[i] || 0, element.length);
	return lines.map((l) => l.map((c, i) => linePrefix + c[i === 0 ? "padStart" : "padEnd"](maxLength[i])).join("  ")).join("\n");
}
function resolveValue(input) {
	return typeof input === "function" ? input() : input;
}
function parseRawArgs(args = [], opts = {}) {
	const booleans = new Set(opts.boolean || []);
	const strings = new Set(opts.string || []);
	const aliasMap = opts.alias || {};
	const defaults = opts.default || {};
	const aliasToMain = /* @__PURE__ */ new Map();
	const mainToAliases = /* @__PURE__ */ new Map();
	for (const [key, value] of Object.entries(aliasMap)) {
		const targets = value;
		for (const target of targets) {
			aliasToMain.set(key, target);
			if (!mainToAliases.has(target)) mainToAliases.set(target, []);
			mainToAliases.get(target).push(key);
			aliasToMain.set(target, key);
			if (!mainToAliases.has(key)) mainToAliases.set(key, []);
			mainToAliases.get(key).push(target);
		}
	}
	const options = {};
	function getType(name) {
		if (booleans.has(name)) return "boolean";
		const aliases = mainToAliases.get(name) || [];
		for (const alias of aliases) if (booleans.has(alias)) return "boolean";
		return "string";
	}
	function isStringType(name) {
		if (strings.has(name)) return true;
		const aliases = mainToAliases.get(name) || [];
		for (const alias of aliases) if (strings.has(alias)) return true;
		return false;
	}
	const allOptions = new Set([
		...booleans,
		...strings,
		...Object.keys(aliasMap),
		...Object.values(aliasMap).flat(),
		...Object.keys(defaults)
	]);
	for (const name of allOptions) if (!options[name]) options[name] = {
		type: getType(name),
		default: defaults[name]
	};
	for (const [alias, main] of aliasToMain.entries()) if (alias.length === 1 && options[main] && !options[main].short) options[main].short = alias;
	const processedArgs = [];
	const negatedFlags = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--") {
			processedArgs.push(...args.slice(i));
			break;
		}
		if (arg.startsWith("--no-")) {
			const flagName = arg.slice(5);
			negatedFlags[flagName] = true;
			continue;
		}
		processedArgs.push(arg);
	}
	let parsed;
	try {
		parsed = parseArgs({
			args: processedArgs,
			options: Object.keys(options).length > 0 ? options : void 0,
			allowPositionals: true,
			strict: false
		});
	} catch {
		parsed = {
			values: {},
			positionals: processedArgs
		};
	}
	const out = { _: [] };
	out._ = parsed.positionals;
	for (const [key, value] of Object.entries(parsed.values)) {
		let coerced = value;
		if (getType(key) === "boolean" && typeof value === "string") coerced = value !== "false";
		else if (isStringType(key) && typeof value === "boolean") coerced = "";
		out[key] = coerced;
	}
	for (const [name] of Object.entries(negatedFlags)) {
		out[name] = false;
		const mainName = aliasToMain.get(name);
		if (mainName) out[mainName] = false;
		const aliases = mainToAliases.get(name);
		if (aliases) for (const alias of aliases) out[alias] = false;
	}
	for (const [alias, main] of aliasToMain.entries()) {
		if (out[alias] !== void 0 && out[main] === void 0) out[main] = out[alias];
		if (out[main] !== void 0 && out[alias] === void 0) out[alias] = out[main];
		if (out[alias] !== out[main] && defaults[main] === out[main]) out[main] = out[alias];
	}
	return out;
}
function parseArgs$1(rawArgs, argsDef) {
	const parseOptions = {
		boolean: [],
		string: [],
		alias: {},
		default: {}
	};
	const args = resolveArgs(argsDef);
	for (const arg of args) {
		if (arg.type === "positional") continue;
		if (arg.type === "string" || arg.type === "enum") parseOptions.string.push(arg.name);
		else if (arg.type === "boolean") parseOptions.boolean.push(arg.name);
		if (arg.default !== void 0) parseOptions.default[arg.name] = arg.default;
		if (arg.alias) parseOptions.alias[arg.name] = arg.alias;
		const camelName = camelCase(arg.name);
		const kebabName = kebabCase(arg.name);
		if (camelName !== arg.name || kebabName !== arg.name) {
			const existingAliases = toArray(parseOptions.alias[arg.name] || []);
			if (camelName !== arg.name && !existingAliases.includes(camelName)) existingAliases.push(camelName);
			if (kebabName !== arg.name && !existingAliases.includes(kebabName)) existingAliases.push(kebabName);
			if (existingAliases.length > 0) parseOptions.alias[arg.name] = existingAliases;
		}
	}
	const parsed = parseRawArgs(rawArgs, parseOptions);
	const [ ...positionalArguments] = parsed._;
	const parsedArgsProxy = new Proxy(parsed, { get(target, prop) {
		return target[prop] ?? target[camelCase(prop)] ?? target[kebabCase(prop)];
	} });
	for (const [, arg] of args.entries()) if (arg.type === "positional") {
		const nextPositionalArgument = positionalArguments.shift();
		if (nextPositionalArgument !== void 0) parsedArgsProxy[arg.name] = nextPositionalArgument;
		else if (arg.default === void 0 && arg.required !== false) throw new CLIError(`Missing required positional argument: ${arg.name.toUpperCase()}`, "EARG");
		else parsedArgsProxy[arg.name] = arg.default;
	} else if (arg.type === "enum") {
		const argument = parsedArgsProxy[arg.name];
		const options = arg.options || [];
		if (argument !== void 0 && options.length > 0 && !options.includes(argument)) throw new CLIError(`Invalid value for argument: ${cyan(`--${arg.name}`)} (${cyan(argument)}). Expected one of: ${options.map((o) => cyan(o)).join(", ")}.`, "EARG");
	} else if (arg.required && parsedArgsProxy[arg.name] === void 0) throw new CLIError(`Missing required argument: --${arg.name}`, "EARG");
	return parsedArgsProxy;
}
function resolveArgs(argsDef) {
	const args = [];
	for (const [name, argDef] of Object.entries(argsDef || {})) args.push({
		...argDef,
		name,
		alias: toArray(argDef.alias)
	});
	return args;
}
async function resolvePlugins(plugins) {
	return Promise.all(plugins.map((p) => resolveValue(p)));
}
function defineCommand(def) {
	return def;
}
async function runCommand(cmd, opts) {
	const cmdArgs = await resolveValue(cmd.args || {});
	const parsedArgs = parseArgs$1(opts.rawArgs, cmdArgs);
	const context = {
		rawArgs: opts.rawArgs,
		args: parsedArgs,
		data: opts.data,
		cmd
	};
	const plugins = await resolvePlugins(cmd.plugins ?? []);
	let result;
	let runError;
	try {
		for (const plugin of plugins) await plugin.setup?.(context);
		if (typeof cmd.setup === "function") await cmd.setup(context);
		const subCommands = await resolveValue(cmd.subCommands);
		if (subCommands && Object.keys(subCommands).length > 0) {
			const subCommandArgIndex = findSubCommandIndex(opts.rawArgs, cmdArgs);
			const explicitName = opts.rawArgs[subCommandArgIndex];
			if (explicitName) {
				const subCommand = await _findSubCommand(subCommands, explicitName);
				if (!subCommand) throw new CLIError(`Unknown command ${cyan(explicitName)}`, "E_UNKNOWN_COMMAND");
				await runCommand(subCommand, { rawArgs: opts.rawArgs.slice(subCommandArgIndex + 1) });
			} else {
				const defaultSubCommand = await resolveValue(cmd.default);
				if (defaultSubCommand) {
					if (cmd.run) throw new CLIError(`Cannot specify both 'run' and 'default' on the same command.`, "E_DEFAULT_CONFLICT");
					const subCommand = await _findSubCommand(subCommands, defaultSubCommand);
					if (!subCommand) throw new CLIError(`Default sub command ${cyan(defaultSubCommand)} not found in subCommands.`, "E_UNKNOWN_COMMAND");
					await runCommand(subCommand, { rawArgs: opts.rawArgs });
				} else if (!cmd.run) throw new CLIError(`No command specified.`, "E_NO_COMMAND");
			}
		}
		if (typeof cmd.run === "function") result = await cmd.run(context);
	} catch (error) {
		runError = error;
	}
	const cleanupErrors = [];
	if (typeof cmd.cleanup === "function") try {
		await cmd.cleanup(context);
	} catch (error) {
		cleanupErrors.push(error);
	}
	for (const plugin of [...plugins].reverse()) try {
		await plugin.cleanup?.(context);
	} catch (error) {
		cleanupErrors.push(error);
	}
	if (runError) throw runError;
	if (cleanupErrors.length === 1) throw cleanupErrors[0];
	if (cleanupErrors.length > 1) throw new Error("Multiple cleanup errors", { cause: cleanupErrors });
	return { result };
}
async function resolveSubCommand(cmd, rawArgs, parent) {
	const subCommands = await resolveValue(cmd.subCommands);
	if (subCommands && Object.keys(subCommands).length > 0) {
		const subCommandArgIndex = findSubCommandIndex(rawArgs, await resolveValue(cmd.args || {}));
		const subCommandName = rawArgs[subCommandArgIndex];
		const subCommand = await _findSubCommand(subCommands, subCommandName);
		if (subCommand) return resolveSubCommand(subCommand, rawArgs.slice(subCommandArgIndex + 1), cmd);
	}
	return [cmd, parent];
}
async function _findSubCommand(subCommands, name) {
	if (name in subCommands) return resolveValue(subCommands[name]);
	for (const sub of Object.values(subCommands)) {
		const resolved = await resolveValue(sub);
		const meta = await resolveValue(resolved?.meta);
		if (meta?.alias) {
			if (toArray(meta.alias).includes(name)) return resolved;
		}
	}
}
function findSubCommandIndex(rawArgs, argsDef) {
	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i];
		if (arg === "--") return -1;
		if (arg.startsWith("-")) {
			if (!arg.includes("=") && _isValueFlag(arg, argsDef)) i++;
			continue;
		}
		return i;
	}
	return -1;
}
function _isValueFlag(flag, argsDef) {
	const name = flag.replace(/^-{1,2}/, "");
	const normalized = camelCase(name);
	for (const [key, def] of Object.entries(argsDef)) {
		if (def.type !== "string" && def.type !== "enum") continue;
		if (normalized === camelCase(key)) return true;
		if ((Array.isArray(def.alias) ? def.alias : def.alias ? [def.alias] : []).includes(name)) return true;
	}
	return false;
}
async function showUsage(cmd, parent) {
	try {
		console.log(await renderUsage(cmd, parent) + "\n");
	} catch (error) {
		console.error(error);
	}
}
async function renderUsage(cmd, parent) {
	const cmdMeta = await resolveValue(cmd.meta || {});
	const cmdArgs = resolveArgs(await resolveValue(cmd.args || {}));
	const parentMeta = await resolveValue(parent?.meta || {});
	const commandName = `${parentMeta.name ? `${parentMeta.name} ` : ""}` + (cmdMeta.name || process.argv[1]);
	const argLines = [];
	const posLines = [];
	const commandsLines = [];
	const usageLine = [];
	for (const arg of cmdArgs) if (arg.type === "positional") {
		const name = arg.name.toUpperCase();
		const isRequired = arg.required !== false && arg.default === void 0;
		posLines.push([cyan(name + renderValueHint(arg)), renderDescription(arg, isRequired)]);
		usageLine.push(isRequired ? `<${name}>` : `[${name}]`);
	} else {
		const isRequired = arg.required === true && arg.default === void 0;
		const argStr = [...(arg.alias || []).map((a) => `-${a}`), `--${arg.name}`].join(", ") + renderValueHint(arg);
		argLines.push([cyan(argStr), renderDescription(arg, isRequired)]);
		/**
		* print negative boolean arg variant usage when
		* - enabled by default or has `negativeDescription`
		* - not prefixed with `no-` or `no[A-Z]`
		*/
		if (arg.type === "boolean" && (arg.default === true || arg.negativeDescription) && !negativePrefixRe.test(arg.name)) {
			const negativeArgStr = [...(arg.alias || []).map((a) => `--no-${a}`), `--no-${arg.name}`].join(", ");
			argLines.push([cyan(negativeArgStr), [arg.negativeDescription, isRequired ? gray("(Required)") : ""].filter(Boolean).join(" ")]);
		}
		if (isRequired) usageLine.push(`--${arg.name}` + renderValueHint(arg));
	}
	if (cmd.subCommands) {
		const commandNames = [];
		const subCommands = await resolveValue(cmd.subCommands);
		for (const [name, sub] of Object.entries(subCommands)) {
			const meta = await resolveValue((await resolveValue(sub))?.meta);
			if (meta?.hidden) continue;
			const aliases = toArray(meta?.alias);
			const label = [name, ...aliases].join(", ");
			commandsLines.push([cyan(label), meta?.description || ""]);
			commandNames.push(name, ...aliases);
		}
		usageLine.push(commandNames.join("|"));
	}
	const usageLines = [];
	const version = cmdMeta.version || parentMeta.version;
	usageLines.push(gray(`${cmdMeta.description} (${commandName + (version ? ` v${version}` : "")})`), "");
	const hasOptions = argLines.length > 0 || posLines.length > 0;
	usageLines.push(`${underline(bold("USAGE"))} ${cyan(`${commandName}${hasOptions ? " [OPTIONS]" : ""} ${usageLine.join(" ")}`)}`, "");
	if (posLines.length > 0) {
		usageLines.push(underline(bold("ARGUMENTS")), "");
		usageLines.push(formatLineColumns(posLines, "  "));
		usageLines.push("");
	}
	if (argLines.length > 0) {
		usageLines.push(underline(bold("OPTIONS")), "");
		usageLines.push(formatLineColumns(argLines, "  "));
		usageLines.push("");
	}
	if (commandsLines.length > 0) {
		usageLines.push(underline(bold("COMMANDS")), "");
		usageLines.push(formatLineColumns(commandsLines, "  "));
		usageLines.push("", `Use ${cyan(`${commandName} <command> --help`)} for more information about a command.`);
	}
	return usageLines.filter((l) => typeof l === "string").join("\n");
}
function renderValueHint(arg) {
	const valueHint = arg.valueHint ? `=<${arg.valueHint}>` : "";
	const fallbackValueHint = valueHint || `=<${snakeCase(arg.name)}>`;
	if (!arg.type || arg.type === "positional" || arg.type === "boolean") return valueHint;
	if (arg.type === "enum" && arg.options?.length) return `=<${arg.options.join("|")}>`;
	return fallbackValueHint;
}
function renderDescription(arg, required) {
	const requiredHint = required ? gray("(Required)") : "";
	const defaultHint = arg.default === void 0 ? "" : gray(`(Default: ${arg.default})`);
	return [
		arg.description,
		requiredHint,
		defaultHint
	].filter(Boolean).join(" ");
}
async function runMain(cmd, opts = {}) {
	const rawArgs = opts.rawArgs || process.argv.slice(2);
	const showUsage$1 = opts.showUsage || showUsage;
	try {
		const builtinFlags = await _resolveBuiltinFlags(cmd);
		if (builtinFlags.help.length > 0 && rawArgs.some((arg) => builtinFlags.help.includes(arg))) {
			await showUsage$1(...await resolveSubCommand(cmd, rawArgs));
			process.exit(0);
		} else if (rawArgs.length === 1 && builtinFlags.version.includes(rawArgs[0])) {
			const meta = typeof cmd.meta === "function" ? await cmd.meta() : await cmd.meta;
			if (!meta?.version) throw new CLIError("No version specified", "E_NO_VERSION");
			console.log(meta.version);
		} else await runCommand(cmd, { rawArgs });
	} catch (error) {
		if (error instanceof CLIError) {
			await showUsage$1(...await resolveSubCommand(cmd, rawArgs));
			console.error(error.message);
		} else console.error(error, "\n");
		process.exit(1);
	}
}
async function _resolveBuiltinFlags(cmd) {
	const argsDef = await resolveValue(cmd.args || {});
	const userNames = /* @__PURE__ */ new Set();
	const userAliases = /* @__PURE__ */ new Set();
	for (const [name, def] of Object.entries(argsDef)) {
		userNames.add(name);
		for (const alias of toArray(def.alias)) userAliases.add(alias);
	}
	return {
		help: _getBuiltinFlags("help", "h", userNames, userAliases),
		version: _getBuiltinFlags("version", "v", userNames, userAliases)
	};
}
function _getBuiltinFlags(long, short, userNames, userAliases) {
	if (userNames.has(long) || userAliases.has(long)) return [];
	if (userNames.has(short) || userAliases.has(short)) return [`--${long}`];
	return [`--${long}`, `-${short}`];
}
var CLIError, noColor, _c, bold, cyan, gray, underline, negativePrefixRe;
var init_dist$6 = __esmMin((() => {
	init_scule();
	CLIError = class extends Error {
		code;
		constructor(message, code) {
			super(message);
			this.name = "CLIError";
			this.code = code;
		}
	};
	noColor = /* @__PURE__ */ (() => {
		const env = globalThis.process?.env ?? {};
		return env.NO_COLOR === "1" || env.TERM === "dumb" || env.TEST || env.CI;
	})();
	_c = (c, r = 39) => (t) => noColor ? t : `\u001B[${c}m${t}\u001B[${r}m`;
	bold = /* @__PURE__ */ _c(1, 22);
	cyan = /* @__PURE__ */ _c(36);
	gray = /* @__PURE__ */ _c(90);
	underline = /* @__PURE__ */ _c(4, 24);
	negativePrefixRe = /^no[-A-Z]/;
}));
//#endregion
//#region node_modules/picocolors/picocolors.js
var require_picocolors = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	let p = process || {}, argv = p.argv || [], env = p.env || {};
	let isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env.TERM !== "dumb" || !!env.CI);
	let formatter = (open, close, replace = open) => (input) => {
		let string = "" + input, index = string.indexOf(close, open.length);
		return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
	};
	let replaceClose = (string, close, replace, index) => {
		let result = "", cursor = 0;
		do {
			result += string.substring(cursor, index) + replace;
			cursor = index + close.length;
			index = string.indexOf(close, cursor);
		} while (~index);
		return result + string.substring(cursor);
	};
	let createColors = (enabled = isColorSupported) => {
		let f = enabled ? formatter : () => String;
		return {
			isColorSupported: enabled,
			reset: f("\x1B[0m", "\x1B[0m"),
			bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
			dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
			italic: f("\x1B[3m", "\x1B[23m"),
			underline: f("\x1B[4m", "\x1B[24m"),
			inverse: f("\x1B[7m", "\x1B[27m"),
			hidden: f("\x1B[8m", "\x1B[28m"),
			strikethrough: f("\x1B[9m", "\x1B[29m"),
			black: f("\x1B[30m", "\x1B[39m"),
			red: f("\x1B[31m", "\x1B[39m"),
			green: f("\x1B[32m", "\x1B[39m"),
			yellow: f("\x1B[33m", "\x1B[39m"),
			blue: f("\x1B[34m", "\x1B[39m"),
			magenta: f("\x1B[35m", "\x1B[39m"),
			cyan: f("\x1B[36m", "\x1B[39m"),
			white: f("\x1B[37m", "\x1B[39m"),
			gray: f("\x1B[90m", "\x1B[39m"),
			bgBlack: f("\x1B[40m", "\x1B[49m"),
			bgRed: f("\x1B[41m", "\x1B[49m"),
			bgGreen: f("\x1B[42m", "\x1B[49m"),
			bgYellow: f("\x1B[43m", "\x1B[49m"),
			bgBlue: f("\x1B[44m", "\x1B[49m"),
			bgMagenta: f("\x1B[45m", "\x1B[49m"),
			bgCyan: f("\x1B[46m", "\x1B[49m"),
			bgWhite: f("\x1B[47m", "\x1B[49m"),
			blackBright: f("\x1B[90m", "\x1B[39m"),
			redBright: f("\x1B[91m", "\x1B[39m"),
			greenBright: f("\x1B[92m", "\x1B[39m"),
			yellowBright: f("\x1B[93m", "\x1B[39m"),
			blueBright: f("\x1B[94m", "\x1B[39m"),
			magentaBright: f("\x1B[95m", "\x1B[39m"),
			cyanBright: f("\x1B[96m", "\x1B[39m"),
			whiteBright: f("\x1B[97m", "\x1B[39m"),
			bgBlackBright: f("\x1B[100m", "\x1B[49m"),
			bgRedBright: f("\x1B[101m", "\x1B[49m"),
			bgGreenBright: f("\x1B[102m", "\x1B[49m"),
			bgYellowBright: f("\x1B[103m", "\x1B[49m"),
			bgBlueBright: f("\x1B[104m", "\x1B[49m"),
			bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
			bgCyanBright: f("\x1B[106m", "\x1B[49m"),
			bgWhiteBright: f("\x1B[107m", "\x1B[49m")
		};
	};
	module.exports = createColors();
	module.exports.createColors = createColors;
}));
//#endregion
//#region src/lib/constants.ts
var JOURNAL_DIR;
var init_constants = __esmMin((() => {
	JOURNAL_DIR = ".whydone";
}));
//#endregion
//#region src/lib/copy-skills.ts
/**
* Recursively copy template skill files from templatesDir to targetDir.
*
* Idempotent: skips files that already exist at the target when !force.
* Does NOT write to the lock file — that is the init command's responsibility.
*
* @param templatesDir - Absolute path to templates/skills/ in pkg root
* @param targetDir    - Absolute path to .claude/skills/ (or ~/.claude/skills/)
* @param opts         - { force?: boolean } — when true, overwrites existing files
* @returns CopyResult with arrays of copied and skipped relative paths
*/
async function copySkills(templatesDir, targetDir, opts) {
	const copied = [];
	const skipped = [];
	async function walkDir(currentDir) {
		let entries;
		try {
			entries = await readdir(currentDir, { withFileTypes: true });
		} catch (err) {
			if (err.code === "ENOENT") return;
			throw err;
		}
		for (const entry of entries) {
			const fullSrcPath = path.join(currentDir, entry.name);
			const relPath = path.relative(templatesDir, fullSrcPath);
			const fullTargetPath = path.join(targetDir, relPath);
			if (entry.isDirectory()) await walkDir(fullSrcPath);
			else if (entry.isFile()) {
				let exists = false;
				try {
					await access(fullTargetPath);
					exists = true;
				} catch {
					exists = false;
				}
				if (exists && !opts.force) skipped.push(relPath);
				else {
					await mkdir(path.dirname(fullTargetPath), { recursive: true });
					await copyFile(fullSrcPath, fullTargetPath);
					copied.push(relPath);
				}
			}
		}
	}
	await walkDir(templatesDir);
	return {
		copied,
		skipped
	};
}
var init_copy_skills = __esmMin((() => {}));
//#endregion
//#region src/lib/marker-block.ts
/**
* Build the whydone marker block as lines, markers included.
*
* The block is mode-neutral by design (06-DESIGN §6.5): the journal mode
* lives in `.whydone/config.json` and can change on a mere git pull, so the
* block routes writes through /log and lets the skill read the mode itself.
*/
function buildBlockLines(indexPath, scope) {
	return [
		MARKER_START,
		"## whydone — work journal",
		"",
		scope === "global" ? `Projects may keep a work journal in a repo-level \`.whydone/\` directory. If present, read \`${indexPath}\` for an overview; do not bulk-read entry files.` : `This project keeps a decision log in \`.whydone/\`. For an overview read \`${indexPath}\`; do not bulk-read entry files.`,
		"Before starting work on a topic, load relevant past entries with `/recall` (or `/whydone:recall` if installed as a plugin).",
		"Entries are written only through the `/log` skill, per the journal mode in `.whydone/config.json` (ask / auto / manual — the skill reads it itself). Never create or edit `.whydone/` entry files by any other means.",
		MARKER_END
	];
}
/**
* A marker counts only as a whole line (trailing spaces / \r tolerated).
* The block is always written with both markers on their own lines, so a
* prose mention of `<!-- whydone:start -->` inside a sentence is not one.
*/
function isMarkerLine(line, marker) {
	return line.trim() === marker;
}
function isAnyMarkerLine(line) {
	return isMarkerLine(line, "<!-- whydone:start -->") || isMarkerLine(line, "<!-- whydone:end -->");
}
/**
* Locate the managed block: the LAST start-marker line with the first
* end-marker line after it — the same rule as locateBlock in git-exclude.ts,
* for the same reason (v1.3 audit, reproduced): a naive first-indexOf pair
* let a stray lone start marker above user content "open" a block that
* ended at the real one, so uninstall deleted everything in between — the
* user's own CLAUDE.md rules included — and an end marker sitting above the
* start duplicated the text between them on every init.
*/
function locateBlock$1(lines) {
	let start = -1;
	for (let i = lines.length - 1; i >= 0; i--) if (isMarkerLine(lines[i], "<!-- whydone:start -->")) {
		start = i;
		break;
	}
	if (start === -1) return null;
	for (let i = start + 1; i < lines.length; i++) if (isMarkerLine(lines[i], "<!-- whydone:end -->")) return {
		start,
		end: i
	};
	return null;
}
/** Line terminator for the lines whydone writes: CRLF only when the file already uses it. */
function detectEol(text) {
	return text.includes("\r\n") ? "\r\n" : "\n";
}
/** File content, or null on ENOENT. Other errors propagate. */
async function readIfExists(filePath) {
	try {
		return await readFile(filePath, "utf-8");
	} catch (err) {
		if (err.code === "ENOENT") return null;
		throw err;
	}
}
/**
* Insert or update the whydone marker block in CLAUDE.md.
*
* - Reads the file (treats ENOENT as an empty file)
* - If a block is located: replaces it in place (idempotent update)
* - If not: appends the block after the trimmed content, two-newline separated
* - Either way, stray lone marker lines outside the block are dropped so they
*   can never pair up with a future block. User text is never touched.
*
* T-02-05 mitigation: idempotent — locate before deciding insert vs. replace.
*/
async function patchClaudeMd(claudeMdPath, indexPath, scope = "project") {
	const existing = await readIfExists(claudeMdPath) ?? "";
	const eol = detectEol(existing);
	const cr = eol === "\r\n" ? "\r" : "";
	const lines = existing.split("\n");
	const blockLines = buildBlockLines(indexPath, scope);
	const block = locateBlock$1(lines);
	let result;
	if (block !== null) {
		const before = lines.slice(0, block.start).filter((l) => !isAnyMarkerLine(l));
		const after = lines.slice(block.end + 1).filter((l) => !isAnyMarkerLine(l));
		result = [
			...before,
			...blockLines.map((l) => l + cr),
			...after
		].join("\n");
	} else {
		const head = lines.filter((l) => !isAnyMarkerLine(l)).join("\n").trimEnd();
		result = (head ? head + eol + eol : "") + blockLines.join(eol) + eol;
	}
	await writeFile(claudeMdPath, result, "utf-8");
}
/**
* Remove the whydone marker block from CLAUDE.md.
*
* - No-ops if no block is located or the file does not exist
* - Preserves all content before and after the block (stray lone markers
*   outside it are dropped along with the block)
*/
async function removeMarkerBlock(claudeMdPath) {
	const existing = await readIfExists(claudeMdPath);
	if (existing === null) return;
	const lines = existing.split("\n");
	const block = locateBlock$1(lines);
	if (block === null) return;
	const eol = detectEol(existing);
	const before = lines.slice(0, block.start).filter((l) => !isAnyMarkerLine(l)).join("\n").trimEnd();
	const after = lines.slice(block.end + 1).filter((l) => !isAnyMarkerLine(l)).join("\n").replace(/^(\r?\n)+/, "");
	let result;
	if (!after) result = before + eol;
	else if (!before) result = after;
	else result = before + eol + eol + after;
	await writeFile(claudeMdPath, result, "utf-8");
}
var MARKER_START, MARKER_END;
var init_marker_block = __esmMin((() => {
	MARKER_START = "<!-- whydone:start -->";
	MARKER_END = "<!-- whydone:end -->";
}));
//#endregion
//#region src/lib/lock-file.ts
/**
* Normalize a relative path to POSIX separators for the lock file (v2, §7.2).
* The committed lock must be byte-stable across machines and OSes.
*/
function toPosixPath(p) {
	return p.split(path.sep).join("/");
}
/**
* Structural check for a parsed lock. A v2 lock must carry every field the
* commands dereference (skills[], skillsDir, claudeMdPath, …): a truncated or
* hand-edited `{"lockVersion": 2}` used to crash uninstall/update with a
* TypeError instead of a clean message (v1.3 audit). Any other object passes
* through untouched — a v1-era lock has no lockVersion at all — so the
* callers' "older whydone — delete and re-init" message still fires for it.
*/
function isLockFileShape(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const o = value;
	if (o.lockVersion !== 2) return true;
	return typeof o.version === "string" && (o.scope === "project" || o.scope === "global") && typeof o.skillsDir === "string" && Array.isArray(o.skills) && o.skills.every((s) => typeof s === "string") && typeof o.claudeMdPatched === "boolean" && typeof o.claudeMdPath === "string";
}
/**
* Read the whydone lock file.
*
* T-02-04 mitigation: JSON.parse wrapped in try/catch — returns null on ENOENT,
* invalid JSON, or a structurally invalid lock (isLockFileShape); never throws.
*
* @param lockPath - Absolute path to the lock file
* @returns Parsed LockFile or null if file missing, JSON invalid, or shape wrong
*/
async function readLockFile(lockPath) {
	try {
		const raw = await readFile(lockPath, "utf-8");
		const parsed = JSON.parse(raw);
		return isLockFileShape(parsed) ? parsed : null;
	} catch {
		return null;
	}
}
/**
* Write the whydone lock file.
*
* Creates parent directories if needed (e.g., .claude/ may not exist yet).
*
* @param lockPath - Absolute path to the lock file
* @param data - Lock file data to write
*/
async function writeLockFile(lockPath, data) {
	await mkdir(path.dirname(lockPath), { recursive: true });
	await writeFile(lockPath, JSON.stringify(data, null, 2), "utf-8");
}
/**
* Delete the whydone lock file.
*
* No-ops if the file does not exist. Rethrows other errors.
*
* @param lockPath - Absolute path to the lock file
*/
async function deleteLockFile(lockPath) {
	try {
		await unlink(lockPath);
	} catch (err) {
		if (err.code === "ENOENT") return;
		throw err;
	}
}
var init_lock_file = __esmMin((() => {}));
//#endregion
//#region src/lib/config.ts
/** Type guard for the closed mode enum. */
function isWhydoneMode(value) {
	return typeof value === "string" && VALID_MODES.has(value);
}
/** Lenient storage reader: only the literal 'local' opts in. */
function asStorage(value) {
	return value === "local" ? "local" : "committed";
}
/** Type guard for the language tag accepted by --language and read from config. */
function isLanguageTag(value) {
	return typeof value === "string" && LANGUAGE_RE.test(value);
}
/** Lenient language reader: a malformed value reads as absent. */
function asLanguage(value) {
	return isLanguageTag(value) ? value : void 0;
}
/**
* Read the config strictly: returns the parsed config only when the file
* exists, parses, has configVersion === 1, and a valid mode. Otherwise null.
* Used by init to distinguish "valid committed policy" from "absent/broken".
*/
async function readConfigIfValid(journalDir) {
	try {
		const raw = await readFile(path.join(journalDir, CONFIG_BASENAME), "utf-8");
		const parsed = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
		const obj = parsed;
		if (obj.configVersion !== 1) return null;
		if (!isWhydoneMode(obj.mode)) return null;
		const language = asLanguage(obj.language);
		return language === void 0 ? {
			mode: obj.mode,
			storage: asStorage(obj.storage)
		} : {
			mode: obj.mode,
			storage: asStorage(obj.storage),
			language
		};
	} catch {
		return null;
	}
}
/**
* Read the config leniently (design §1.3). Absent/unreadable/invalid ⇒
* { mode: 'manual', storage: 'committed' }. Never throws.
*/
async function readConfig(journalDir) {
	return await readConfigIfValid(journalDir) ?? {
		mode: "manual",
		storage: "committed"
	};
}
/**
* Create or update .whydone/config.json with the given mode (and optionally
* storage / language). Read-modify-write: unknown keys in an existing
* (parseable) file are preserved (design §1.1). storage and language are only
* written when passed explicitly or already present — a v0.3-era two-key
* config stays byte-stable across mode-only rewrites, and a hide/publish
* storage flip never drops a configured language. Serialized with
* JSON.stringify(_, null, 2).
*/
async function writeConfigMode(journalDir, mode, storage, language) {
	const configPath = path.join(journalDir, CONFIG_BASENAME);
	let existing = {};
	try {
		const parsed = JSON.parse(await readFile(configPath, "utf-8"));
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) existing = parsed;
	} catch {}
	const next = {
		...existing,
		configVersion: 1,
		mode
	};
	if (storage !== void 0) next.storage = storage;
	if (language !== void 0) next.language = language;
	await writeFile(configPath, JSON.stringify(next, null, 2), "utf-8");
}
var CONFIG_BASENAME, VALID_MODES, LANGUAGE_RE;
var init_config = __esmMin((() => {
	CONFIG_BASENAME = "config.json";
	VALID_MODES = new Set([
		"ask",
		"auto",
		"manual"
	]);
	LANGUAGE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
}));
//#endregion
//#region src/lib/settings-hooks.ts
/**
* Stop-hook install/remove for Claude Code settings files (design §3.1, §3.3).
*
* The settings command is shell-dialect-free by construction:
*   node "<absolute path>/whydone-hook.cjs"
* — a bare program + one double-quoted absolute argument, which parses
* identically under sh, bash, Git Bash, cmd.exe, and PowerShell. All guard
* logic (project-dir resolution, whydone-present check, fail-open) lives in
* the launcher's JavaScript, not in shell semantics.
*
* Write-back care (§3.3 step 4): settings files are live — Claude Code itself
* writes settings.local.json mid-session. Guards:
*  - Optimistic-lock write: stat before write; if the file changed since the
*    read, re-read and re-apply the mutation once; a second change ⇒ 'conflict',
*    touch nothing. Read→mutate→write uses sync fs — no intervening awaits.
*  - Formatting preservation: serialize with the file's own detected
*    indentation (first ^[ \t]+ match; default two spaces) and preserve
*    presence/absence of a trailing newline. Key order is preserved because
*    the mutation edits the parsed object in place.
*/
/** The settings command: `node "<launcherPath>"` — platform-native absolute path. */
function buildHookCommand(launcherPath) {
	return `node "${launcherPath}"`;
}
/**
* The §3.1 launcher body — deterministic bytes, no machine-specific paths.
* CJS so it runs regardless of any surrounding package.json "type" field.
* Behavior, pinned:
*  1. Everything ends in `finally { process.exit(0) }` — the launcher CANNOT
*     exit non-zero (this replaces `|| true` with something no shell dialect
*     can break).
*  2. projectDir = CLAUDE_PROJECT_DIR || cwd.
*  3. Fast no-op guards BEFORE loading anything heavy: existsSync('.whydone')
*     miss ⇒ exit 0; require.resolve('whydone/package.json') miss ⇒ exit 0.
*  4. Read stdin fully, spawnSync the CLI with an 8 s timeout, forward child
*     stdout only on clean success. Any error/timeout ⇒ exit 0.
*/
function buildLauncherSource() {
	return `#!/usr/bin/env node
/* whydone Stop-hook launcher — machine-generated by \`whydone init\`.
 * Runs \`whydone hook stop\` for the current project and exits 0 on every
 * path, so a hook failure can never block the user. Safe to delete;
 * \`npx whydone uninstall\` removes it and its settings.json entry. */
'use strict'
try {
  main()
} catch {
  /* fail open */
} finally {
  process.exit(0)
}

function main() {
  const fs = require('node:fs')
  const path = require('node:path')
  const { spawnSync } = require('node:child_process')

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()

  // Fast no-op: not a whydone project — one existsSync, no CLI load.
  if (!fs.existsSync(path.join(projectDir, '.whydone'))) return

  // Resolve the CLI from the project (handles hoisting/pnpm). Whydone
  // removed from node_modules => permanent silence, zero transcript noise.
  let pkgPath
  try {
    pkgPath = require.resolve('whydone/package.json', { paths: [projectDir] })
  } catch {
    return
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const bin = typeof pkg.bin === 'string' ? pkg.bin : (pkg.bin && pkg.bin.whydone) || 'dist/cli.js'
  const cliJs = path.join(path.dirname(pkgPath), bin)

  let input = ''
  try {
    input = fs.readFileSync(0, 'utf8')
  } catch {
    input = ''
  }

  const r = spawnSync(process.execPath, [cliJs, 'hook', 'stop'], {
    input,
    cwd: projectDir,
    timeout: 8000,
    encoding: 'utf8',
  })
  if (!r.error && r.status === 0 && r.stdout) process.stdout.write(r.stdout)
}
`;
}
function isMarkerHandler(h) {
	return h !== null && typeof h === "object" && h.type === "command" && typeof h.command === "string" && h.command.includes("whydone-hook.cjs");
}
function takeSnapshot(settingsPath) {
	try {
		const raw = readFileSync(settingsPath, "utf-8");
		const st = statSync(settingsPath);
		return {
			raw,
			mtimeMs: st.mtimeMs,
			size: st.size
		};
	} catch {
		return {
			raw: null,
			mtimeMs: -1,
			size: -1
		};
	}
}
function fileChangedSince(settingsPath, snap) {
	try {
		const st = statSync(settingsPath);
		return snap.raw === null || st.mtimeMs !== snap.mtimeMs || st.size !== snap.size;
	} catch {
		return snap.raw !== null;
	}
}
function detectIndent(raw) {
	if (raw === null) return "  ";
	const m = /^[ \t]+/m.exec(raw);
	return m ? m[0] : "  ";
}
function serialize(obj, snap) {
	const body = JSON.stringify(obj, null, detectIndent(snap.raw));
	return (snap.raw === null ? true : snap.raw.endsWith("\n")) ? body + "\n" : body;
}
function parseSettings(snap) {
	if (snap.raw === null) return {
		ok: true,
		obj: {}
	};
	try {
		const parsed = JSON.parse(snap.raw);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { ok: false };
		return {
			ok: true,
			obj: parsed
		};
	} catch {
		return { ok: false };
	}
}
/** Every handler object across all Stop groups (lenient about odd shapes). */
function stopHandlers(obj) {
	const hooks = obj.hooks;
	if (typeof hooks !== "object" || hooks === null || Array.isArray(hooks)) return [];
	const stop = hooks.Stop;
	if (!Array.isArray(stop)) return [];
	const out = [];
	for (const group of stop) {
		if (group === null || typeof group !== "object" || !Array.isArray(group.hooks)) continue;
		for (const h of group.hooks) out.push(h);
	}
	return out;
}
/** True when a whydone marker handler exists in the file's Stop hooks. */
async function hasStopHook(settingsPath) {
	const parsed = parseSettings(takeSnapshot(settingsPath));
	if (!parsed.ok) return false;
	return stopHandlers(parsed.obj).some(isMarkerHandler);
}
/**
* Install (or refresh) the whydone Stop hook into a settings file.
* Strict JSON read-modify-write; parse failure ⇒ 'invalid-json', touch nothing.
*/
async function installStopHook(settingsPath, launcherPath) {
	const command = buildHookCommand(launcherPath);
	for (let attempt = 0; attempt < 2; attempt++) {
		const snap = takeSnapshot(settingsPath);
		const parsed = parseSettings(snap);
		if (!parsed.ok) return "invalid-json";
		const obj = parsed.obj;
		if (obj.hooks === void 0) obj.hooks = {};
		const hooks = obj.hooks;
		if (typeof hooks !== "object" || hooks === null || Array.isArray(hooks)) return "invalid-json";
		const hooksObj = hooks;
		if (hooksObj.Stop === void 0) hooksObj.Stop = [];
		if (!Array.isArray(hooksObj.Stop)) return "invalid-json";
		let changed = false;
		let result;
		const marker = stopHandlers(obj).find(isMarkerHandler);
		if (marker !== void 0) {
			if (marker.command !== command) {
				marker.command = command;
				changed = true;
			}
			if (!(typeof marker.timeout === "number" && marker.timeout > 0)) {
				marker.timeout = 10;
				changed = true;
			}
			result = "updated";
		} else {
			hooksObj.Stop.push({ hooks: [{
				type: "command",
				command,
				timeout: 10
			}] });
			changed = true;
			result = "installed";
		}
		if (!changed) return result;
		const out = serialize(obj, snap);
		_testSeams.beforeWrite?.();
		if (fileChangedSince(settingsPath, snap)) continue;
		mkdirSync(path.dirname(settingsPath), { recursive: true });
		writeFileSync(settingsPath, out, "utf-8");
		return result;
	}
	return "conflict";
}
/**
* Remove every whydone marker handler from the settings file's Stop groups.
* Prunes groups whose hooks became empty, drops Stop if empty, drops hooks if
* empty. Writes back only if anything changed. Never deletes the file itself.
*/
async function removeStopHook(settingsPath) {
	for (let attempt = 0; attempt < 2; attempt++) {
		const snap = takeSnapshot(settingsPath);
		if (snap.raw === null) return "absent";
		const parsed = parseSettings(snap);
		if (!parsed.ok) return "invalid-json";
		const obj = parsed.obj;
		const hooks = obj.hooks;
		if (typeof hooks !== "object" || hooks === null || Array.isArray(hooks)) return "absent";
		const hooksObj = hooks;
		const stop = hooksObj.Stop;
		if (!Array.isArray(stop)) return "absent";
		let changed = false;
		const keptGroups = [];
		for (const group of stop) {
			if (group === null || typeof group !== "object" || !Array.isArray(group.hooks)) {
				keptGroups.push(group);
				continue;
			}
			const keptHandlers = group.hooks.filter((h) => !isMarkerHandler(h));
			if (keptHandlers.length !== group.hooks.length) {
				changed = true;
				if (keptHandlers.length === 0) continue;
				group.hooks = keptHandlers;
			}
			keptGroups.push(group);
		}
		if (!changed) return "absent";
		if (keptGroups.length === 0) delete hooksObj.Stop;
		else hooksObj.Stop = keptGroups;
		if (Object.keys(hooksObj).length === 0) delete obj.hooks;
		const out = serialize(obj, snap);
		_testSeams.beforeWrite?.();
		if (fileChangedSince(settingsPath, snap)) continue;
		writeFileSync(settingsPath, out, "utf-8");
		return "removed";
	}
	return "conflict";
}
var LAUNCHER_BASENAME, _testSeams;
var init_settings_hooks = __esmMin((() => {
	LAUNCHER_BASENAME = "whydone-hook.cjs";
	_testSeams = {};
}));
//#endregion
//#region src/lib/git-exclude.ts
/**
* Manage whydone's entries in .git/info/exclude — the LOCAL gitignore.
*
* Why info/exclude and not .gitignore: a committed .gitignore line
* (".whydone/") would itself reveal the journal's existence to the team.
* info/exclude lives inside .git/, is never committed, and hides untracked
* paths with zero trace in any diff. That is the whole storage: local
* guarantee (design v0.4).
*
* Entries live between "# whydone:start" / "# whydone:end" comment lines so
* removal is exact and idempotent — the same marker-block idea as CLAUDE.md,
* in hash-comment form.
*
* The exclude file is resolved via `git rev-parse --git-common-dir`, so all
* worktrees of a repo share one exclusion set (info/exclude lives in the
* common dir). Every function is a silent no-op outside a git repo — a
* journal without git is trivially "local" already.
*
* Limitation by design: info/exclude only hides UNTRACKED paths. Callers must
* check isTracked() first and refuse to "hide" something git already tracks.
*/
/**
* Split file content into lines, tolerating CRLF (an editor or autocrlf may
* have normalized info/exclude). \r is stripped during parsing and the file
* is rewritten LF-only — exact marker matching must never silently fail on
* line endings (v1.0 review: a CRLF file made publish no-op while flipping
* config to committed).
*/
function splitLines(content) {
	return content.split("\n").map((l) => l.endsWith("\r") ? l.slice(0, -1) : l);
}
/**
* Locate the managed block: the LAST start marker with the first end marker
* after it. lastIndexOf defends against a stray lone END above the block,
* which with a naive first-indexOf scan made the block invisible to reads —
* every hide then appended a duplicate block while publish "succeeded"
* without unhiding anything (v1.0 review, reproduced).
*/
function locateBlock(lines) {
	const start = lines.lastIndexOf(START);
	if (start === -1) return null;
	const end = lines.indexOf(END, start + 1);
	if (end === -1) return null;
	return {
		start,
		end
	};
}
/** Absolute path of <common-git-dir>/info/exclude, or null outside a repo. */
function resolveExcludePath(cwd) {
	const res = spawnSync("git", ["rev-parse", "--git-common-dir"], {
		cwd,
		encoding: "utf-8",
		timeout: GIT_TIMEOUT_MS$1
	});
	if (res.status !== 0 || typeof res.stdout !== "string") return null;
	const gitDir = res.stdout.trim();
	if (!gitDir) return null;
	return path.resolve(cwd, gitDir, "info", "exclude");
}
/** True when git tracks the path (committed or staged). False outside a repo. */
function isTracked(cwd, relPath) {
	return spawnSync("git", [
		"ls-files",
		"--error-unmatch",
		"--",
		relPath
	], {
		cwd,
		encoding: "utf-8",
		timeout: GIT_TIMEOUT_MS$1
	}).status === 0;
}
/**
* Convert a cwd-relative path into a repo-root-anchored gitignore pattern
* ("/.whydone/", "/CLAUDE.md"). Anchoring matters: an unanchored "CLAUDE.md"
* would silently hide every future untracked CLAUDE.md anywhere in the tree,
* not just the one whydone manages. Falls back to the input outside a repo
* (callers no-op there anyway).
*/
function rootAnchored(cwd, relPath) {
	const res = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		cwd,
		encoding: "utf-8",
		timeout: GIT_TIMEOUT_MS$1
	});
	const rawTop = res.status === 0 && typeof res.stdout === "string" ? res.stdout.trim() : "";
	if (!rawTop) return relPath;
	const canonical = (p) => {
		try {
			return realpathSync.native(p);
		} catch {
			try {
				return realpathSync(p);
			} catch {
				return p;
			}
		}
	};
	return "/" + path.relative(canonical(rawTop), path.resolve(canonical(cwd), relPath)).split(path.sep).join("/") + (relPath.endsWith("/") ? "/" : "");
}
/** Current whydone-block lines of the exclude file ([] when absent). */
async function readExcludedLines(cwd) {
	const excludePath = resolveExcludePath(cwd);
	if (excludePath === null || !existsSync(excludePath)) return [];
	const lines = splitLines(await readFile(excludePath, "utf-8"));
	const block = locateBlock(lines);
	if (block === null) return [];
	return lines.slice(block.start + 1, block.end).filter((l) => l.trim() !== "");
}
async function writeBlock(cwd, blockLines) {
	const excludePath = resolveExcludePath(cwd);
	if (excludePath === null) return false;
	let content = "";
	if (existsSync(excludePath)) content = await readFile(excludePath, "utf-8");
	const lines = splitLines(content);
	const block = locateBlock(lines);
	const kept = (block !== null ? [...lines.slice(0, block.start), ...lines.slice(block.end + 1)] : lines).filter((l) => l !== START && l !== END);
	while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();
	const next = blockLines.length === 0 ? kept : [
		...kept,
		...kept.length > 0 ? [""] : [],
		START,
		...blockLines,
		END
	];
	await mkdir(path.dirname(excludePath), { recursive: true });
	await writeFile(excludePath, next.join("\n") + (next.length > 0 ? "\n" : ""), "utf-8");
	return true;
}
/**
* Ensure the given repo-relative paths are in the whydone exclude block.
* Returns true when the exclude file was written, false outside a git repo.
*/
async function ensureExcluded(cwd, relPaths) {
	const merged = [...await readExcludedLines(cwd)];
	for (const p of relPaths.map((r) => rootAnchored(cwd, r))) if (!merged.includes(p)) merged.push(p);
	return writeBlock(cwd, merged);
}
/**
* Remove the given paths from the whydone exclude block (drops the whole
* block when it empties). Silent no-op outside a repo or without a block.
*/
async function removeExcluded(cwd, relPaths) {
	const current = await readExcludedLines(cwd);
	if (current.length === 0) return false;
	const targets = new Set([...relPaths, ...relPaths.map((r) => rootAnchored(cwd, r))]);
	const remaining = current.filter((l) => !targets.has(l));
	if (remaining.length === current.length) return false;
	return writeBlock(cwd, remaining);
}
/**
* Roots of OTHER worktrees of this repo whose journal is storage: local.
* publish / uninstall --purge must not drop the shared exclude pattern while
* a sibling worktree still depends on it (the exclude file lives in the
* common git dir — one line hides .whydone/ in every worktree).
*/
function listOtherLocalWorktrees(cwd) {
	const res = spawnSync("git", [
		"worktree",
		"list",
		"--porcelain"
	], {
		cwd,
		encoding: "utf-8",
		timeout: GIT_TIMEOUT_MS$1
	});
	if (res.status !== 0 || typeof res.stdout !== "string") return [];
	const topRes = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		cwd,
		encoding: "utf-8",
		timeout: GIT_TIMEOUT_MS$1
	});
	const currentTop = topRes.status === 0 ? topRes.stdout.trim() : "";
	const out = [];
	for (const line of res.stdout.split("\n")) {
		if (!line.startsWith("worktree ")) continue;
		const root = line.slice(9).trim();
		if (!root || root === currentTop) continue;
		try {
			const raw = readFileSync(path.join(root, ".whydone", "config.json"), "utf-8");
			const parsed = JSON.parse(raw);
			if (typeof parsed === "object" && parsed !== null && parsed.storage === "local") out.push(root);
		} catch {}
	}
	return out;
}
var START, END, GIT_TIMEOUT_MS$1;
var init_git_exclude = __esmMin((() => {
	START = "# whydone:start";
	END = "# whydone:end";
	GIT_TIMEOUT_MS$1 = 2e3;
}));
//#endregion
//#region node_modules/fdir/dist/index.mjs
function cleanPath(path) {
	let normalized = normalize(path);
	if (normalized.length > 1 && normalized[normalized.length - 1] === sep) normalized = normalized.substring(0, normalized.length - 1);
	return normalized;
}
function convertSlashes(path, separator) {
	return path.replace(SLASHES_REGEX, separator);
}
function isRootDirectory(path) {
	return path === "/" || WINDOWS_ROOT_DIR_REGEX.test(path);
}
function normalizePath$2(path, options) {
	const { resolvePaths, normalizePath: normalizePath$1, pathSeparator } = options;
	const pathNeedsCleaning = process.platform === "win32" && path.includes("/") || path.startsWith(".");
	if (resolvePaths) path = resolve(path);
	if (normalizePath$1 || pathNeedsCleaning) path = cleanPath(path);
	if (path === ".") return "";
	return convertSlashes(path[path.length - 1] !== pathSeparator ? path + pathSeparator : path, pathSeparator);
}
function joinPathWithBasePath(filename, directoryPath) {
	return directoryPath + filename;
}
function joinPathWithRelativePath(root, options) {
	return function(filename, directoryPath) {
		if (directoryPath.startsWith(root)) return directoryPath.slice(root.length) + filename;
		else return convertSlashes(relative(root, directoryPath), options.pathSeparator) + options.pathSeparator + filename;
	};
}
function joinPath(filename) {
	return filename;
}
function joinDirectoryPath(filename, directoryPath, separator) {
	return directoryPath + filename + separator;
}
function build$7(root, options) {
	const { relativePaths, includeBasePath } = options;
	return relativePaths && root ? joinPathWithRelativePath(root, options) : includeBasePath ? joinPathWithBasePath : joinPath;
}
function pushDirectoryWithRelativePath(root) {
	return function(directoryPath, paths) {
		paths.push(directoryPath.substring(root.length) || ".");
	};
}
function pushDirectoryFilterWithRelativePath(root) {
	return function(directoryPath, paths, filters) {
		const relativePath = directoryPath.substring(root.length) || ".";
		if (filters.every((filter) => filter(relativePath, true))) paths.push(relativePath);
	};
}
function build$6(root, options) {
	const { includeDirs, filters, relativePaths } = options;
	if (!includeDirs) return empty$2;
	if (relativePaths) return filters && filters.length ? pushDirectoryFilterWithRelativePath(root) : pushDirectoryWithRelativePath(root);
	return filters && filters.length ? pushDirectoryFilter : pushDirectory;
}
function build$5(options) {
	const { excludeFiles, filters, onlyCounts } = options;
	if (excludeFiles) return empty$1;
	if (filters && filters.length) return onlyCounts ? pushFileFilterAndCount : pushFileFilter;
	else if (onlyCounts) return pushFileCount;
	else return pushFile;
}
function build$4(options) {
	return options.group ? getArrayGroup : getArray;
}
function build$3(options) {
	return options.group ? groupFiles : empty;
}
function build$2(options, isSynchronous) {
	if (!options.resolveSymlinks || options.excludeSymlinks) return null;
	return isSynchronous ? resolveSymlinks : resolveSymlinksAsync;
}
function isRecursive(path, resolved, state) {
	if (state.options.useRealPaths) return isRecursiveUsingRealPaths(resolved, state);
	let parent = dirname$1(path);
	let depth = 1;
	while (parent !== state.root && depth < 2) {
		const resolvedPath = state.symlinks.get(parent);
		if (!!resolvedPath && (resolvedPath === resolved || resolvedPath.startsWith(resolved) || resolved.startsWith(resolvedPath))) depth++;
		else parent = dirname$1(parent);
	}
	state.symlinks.set(path, resolved);
	return depth > 1;
}
function isRecursiveUsingRealPaths(resolved, state) {
	return state.visited.includes(resolved + state.options.pathSeparator);
}
function report(error, callback$1, output, suppressErrors) {
	if (error && !suppressErrors) callback$1(error, output);
	else callback$1(null, output);
}
function build$1(options, isSynchronous) {
	const { onlyCounts, group, maxFiles } = options;
	if (onlyCounts) return isSynchronous ? onlyCountsSync : onlyCountsAsync;
	else if (group) return isSynchronous ? groupsSync : groupsAsync;
	else if (maxFiles) return isSynchronous ? limitFilesSync : limitFilesAsync;
	else return isSynchronous ? defaultSync : defaultAsync;
}
function build(isSynchronous) {
	return isSynchronous ? walkSync : walkAsync;
}
function promise(root, options) {
	return new Promise((resolve$1, reject) => {
		callback(root, options, (err, output) => {
			if (err) return reject(err);
			resolve$1(output);
		});
	});
}
function callback(root, options, callback$1) {
	new Walker(root, options, callback$1).start();
}
function sync(root, options) {
	return new Walker(root, options).start();
}
var __require, SLASHES_REGEX, WINDOWS_ROOT_DIR_REGEX, pushDirectory, pushDirectoryFilter, empty$2, pushFileFilterAndCount, pushFileFilter, pushFileCount, pushFile, empty$1, getArray, getArrayGroup, groupFiles, empty, resolveSymlinksAsync, resolveSymlinks, onlyCountsSync, groupsSync, defaultSync, limitFilesSync, onlyCountsAsync, defaultAsync, limitFilesAsync, groupsAsync, readdirOpts, walkAsync, walkSync, Queue, Counter, Aborter, Walker, APIBuilder, pm, Builder;
var init_dist$5 = __esmMin((() => {
	__require = /* @__PURE__ */ createRequire$1(import.meta.url);
	SLASHES_REGEX = /[\\/]/g;
	WINDOWS_ROOT_DIR_REGEX = /^[a-z]:[\\/]$/i;
	pushDirectory = (directoryPath, paths) => {
		paths.push(directoryPath || ".");
	};
	pushDirectoryFilter = (directoryPath, paths, filters) => {
		const path = directoryPath || ".";
		if (filters.every((filter) => filter(path, true))) paths.push(path);
	};
	empty$2 = () => {};
	pushFileFilterAndCount = (filename, _paths, counts, filters) => {
		if (filters.every((filter) => filter(filename, false))) counts.files++;
	};
	pushFileFilter = (filename, paths, _counts, filters) => {
		if (filters.every((filter) => filter(filename, false))) paths.push(filename);
	};
	pushFileCount = (_filename, _paths, counts, _filters) => {
		counts.files++;
	};
	pushFile = (filename, paths) => {
		paths.push(filename);
	};
	empty$1 = () => {};
	getArray = (paths) => {
		return paths;
	};
	getArrayGroup = () => {
		return [""].slice(0, 0);
	};
	groupFiles = (groups, directory, files) => {
		groups.push({
			directory,
			files,
			dir: directory
		});
	};
	empty = () => {};
	resolveSymlinksAsync = function(path, state, callback$1) {
		const { queue, fs, options: { suppressErrors } } = state;
		queue.enqueue();
		fs.realpath(path, (error, resolvedPath) => {
			if (error) return queue.dequeue(suppressErrors ? null : error, state);
			fs.stat(resolvedPath, (error$1, stat) => {
				if (error$1) return queue.dequeue(suppressErrors ? null : error$1, state);
				if (stat.isDirectory() && isRecursive(path, resolvedPath, state)) return queue.dequeue(null, state);
				callback$1(stat, resolvedPath);
				queue.dequeue(null, state);
			});
		});
	};
	resolveSymlinks = function(path, state, callback$1) {
		const { queue, fs, options: { suppressErrors } } = state;
		queue.enqueue();
		try {
			const resolvedPath = fs.realpathSync(path);
			const stat = fs.statSync(resolvedPath);
			if (stat.isDirectory() && isRecursive(path, resolvedPath, state)) return;
			callback$1(stat, resolvedPath);
		} catch (e) {
			if (!suppressErrors) throw e;
		}
	};
	onlyCountsSync = (state) => {
		return state.counts;
	};
	groupsSync = (state) => {
		return state.groups;
	};
	defaultSync = (state) => {
		return state.paths;
	};
	limitFilesSync = (state) => {
		return state.paths.slice(0, state.options.maxFiles);
	};
	onlyCountsAsync = (state, error, callback$1) => {
		report(error, callback$1, state.counts, state.options.suppressErrors);
		return null;
	};
	defaultAsync = (state, error, callback$1) => {
		report(error, callback$1, state.paths, state.options.suppressErrors);
		return null;
	};
	limitFilesAsync = (state, error, callback$1) => {
		report(error, callback$1, state.paths.slice(0, state.options.maxFiles), state.options.suppressErrors);
		return null;
	};
	groupsAsync = (state, error, callback$1) => {
		report(error, callback$1, state.groups, state.options.suppressErrors);
		return null;
	};
	readdirOpts = { withFileTypes: true };
	walkAsync = (state, crawlPath, directoryPath, currentDepth, callback$1) => {
		state.queue.enqueue();
		if (currentDepth < 0) return state.queue.dequeue(null, state);
		const { fs } = state;
		state.visited.push(crawlPath);
		state.counts.directories++;
		fs.readdir(crawlPath || ".", readdirOpts, (error, entries = []) => {
			callback$1(entries, directoryPath, currentDepth);
			state.queue.dequeue(state.options.suppressErrors ? null : error, state);
		});
	};
	walkSync = (state, crawlPath, directoryPath, currentDepth, callback$1) => {
		const { fs } = state;
		if (currentDepth < 0) return;
		state.visited.push(crawlPath);
		state.counts.directories++;
		let entries = [];
		try {
			entries = fs.readdirSync(crawlPath || ".", readdirOpts);
		} catch (e) {
			if (!state.options.suppressErrors) throw e;
		}
		callback$1(entries, directoryPath, currentDepth);
	};
	Queue = class {
		count = 0;
		constructor(onQueueEmpty) {
			this.onQueueEmpty = onQueueEmpty;
		}
		enqueue() {
			this.count++;
			return this.count;
		}
		dequeue(error, output) {
			if (this.onQueueEmpty && (--this.count <= 0 || error)) {
				this.onQueueEmpty(error, output);
				if (error) {
					output.controller.abort();
					this.onQueueEmpty = void 0;
				}
			}
		}
	};
	Counter = class {
		_files = 0;
		_directories = 0;
		set files(num) {
			this._files = num;
		}
		get files() {
			return this._files;
		}
		set directories(num) {
			this._directories = num;
		}
		get directories() {
			return this._directories;
		}
		/**
		* @deprecated use `directories` instead
		*/
		/* c8 ignore next 3 */
		get dirs() {
			return this._directories;
		}
	};
	Aborter = class {
		aborted = false;
		abort() {
			this.aborted = true;
		}
	};
	Walker = class {
		root;
		isSynchronous;
		state;
		joinPath;
		pushDirectory;
		pushFile;
		getArray;
		groupFiles;
		resolveSymlink;
		walkDirectory;
		callbackInvoker;
		constructor(root, options, callback$1) {
			this.isSynchronous = !callback$1;
			this.callbackInvoker = build$1(options, this.isSynchronous);
			this.root = normalizePath$2(root, options);
			this.state = {
				root: isRootDirectory(this.root) ? this.root : this.root.slice(0, -1),
				paths: [""].slice(0, 0),
				groups: [],
				counts: new Counter(),
				options,
				queue: new Queue((error, state) => this.callbackInvoker(state, error, callback$1)),
				symlinks: /* @__PURE__ */ new Map(),
				visited: [""].slice(0, 0),
				controller: new Aborter(),
				fs: options.fs || nativeFs
			};
			this.joinPath = build$7(this.root, options);
			this.pushDirectory = build$6(this.root, options);
			this.pushFile = build$5(options);
			this.getArray = build$4(options);
			this.groupFiles = build$3(options);
			this.resolveSymlink = build$2(options, this.isSynchronous);
			this.walkDirectory = build(this.isSynchronous);
		}
		start() {
			this.pushDirectory(this.root, this.state.paths, this.state.options.filters);
			this.walkDirectory(this.state, this.root, this.root, this.state.options.maxDepth, this.walk);
			return this.isSynchronous ? this.callbackInvoker(this.state, null) : null;
		}
		walk = (entries, directoryPath, depth) => {
			const { paths, options: { filters, resolveSymlinks: resolveSymlinks$1, excludeSymlinks, exclude, maxFiles, signal, useRealPaths, pathSeparator }, controller } = this.state;
			if (controller.aborted || signal && signal.aborted || maxFiles && paths.length > maxFiles) return;
			const files = this.getArray(this.state.paths);
			for (let i = 0; i < entries.length; ++i) {
				const entry = entries[i];
				if (entry.isFile() || entry.isSymbolicLink() && !resolveSymlinks$1 && !excludeSymlinks) {
					const filename = this.joinPath(entry.name, directoryPath);
					this.pushFile(filename, files, this.state.counts, filters);
				} else if (entry.isDirectory()) {
					let path = joinDirectoryPath(entry.name, directoryPath, this.state.options.pathSeparator);
					if (exclude && exclude(entry.name, path)) continue;
					this.pushDirectory(path, paths, filters);
					this.walkDirectory(this.state, path, path, depth - 1, this.walk);
				} else if (this.resolveSymlink && entry.isSymbolicLink()) {
					let path = joinPathWithBasePath(entry.name, directoryPath);
					this.resolveSymlink(path, this.state, (stat, resolvedPath) => {
						if (stat.isDirectory()) {
							resolvedPath = normalizePath$2(resolvedPath, this.state.options);
							if (exclude && exclude(entry.name, useRealPaths ? resolvedPath : path + pathSeparator)) return;
							this.walkDirectory(this.state, resolvedPath, useRealPaths ? resolvedPath : path + pathSeparator, depth - 1, this.walk);
						} else {
							resolvedPath = useRealPaths ? resolvedPath : path;
							const filename = basename(resolvedPath);
							const directoryPath$1 = normalizePath$2(dirname$1(resolvedPath), this.state.options);
							resolvedPath = this.joinPath(filename, directoryPath$1);
							this.pushFile(resolvedPath, files, this.state.counts, filters);
						}
					});
				}
			}
			this.groupFiles(this.state.groups, directoryPath, files);
		};
	};
	APIBuilder = class {
		constructor(root, options) {
			this.root = root;
			this.options = options;
		}
		withPromise() {
			return promise(this.root, this.options);
		}
		withCallback(cb) {
			callback(this.root, this.options, cb);
		}
		sync() {
			return sync(this.root, this.options);
		}
	};
	pm = null;
	/* c8 ignore next 6 */
	try {
		__require.resolve("picomatch");
		pm = __require("picomatch");
	} catch {}
	Builder = class {
		globCache = {};
		options = {
			maxDepth: Infinity,
			suppressErrors: true,
			pathSeparator: sep,
			filters: []
		};
		globFunction;
		constructor(options) {
			this.options = {
				...this.options,
				...options
			};
			this.globFunction = this.options.globFunction;
		}
		group() {
			this.options.group = true;
			return this;
		}
		withPathSeparator(separator) {
			this.options.pathSeparator = separator;
			return this;
		}
		withBasePath() {
			this.options.includeBasePath = true;
			return this;
		}
		withRelativePaths() {
			this.options.relativePaths = true;
			return this;
		}
		withDirs() {
			this.options.includeDirs = true;
			return this;
		}
		withMaxDepth(depth) {
			this.options.maxDepth = depth;
			return this;
		}
		withMaxFiles(limit) {
			this.options.maxFiles = limit;
			return this;
		}
		withFullPaths() {
			this.options.resolvePaths = true;
			this.options.includeBasePath = true;
			return this;
		}
		withErrors() {
			this.options.suppressErrors = false;
			return this;
		}
		withSymlinks({ resolvePaths = true } = {}) {
			this.options.resolveSymlinks = true;
			this.options.useRealPaths = resolvePaths;
			return this.withFullPaths();
		}
		withAbortSignal(signal) {
			this.options.signal = signal;
			return this;
		}
		normalize() {
			this.options.normalizePath = true;
			return this;
		}
		filter(predicate) {
			this.options.filters.push(predicate);
			return this;
		}
		onlyDirs() {
			this.options.excludeFiles = true;
			this.options.includeDirs = true;
			return this;
		}
		exclude(predicate) {
			this.options.exclude = predicate;
			return this;
		}
		onlyCounts() {
			this.options.onlyCounts = true;
			return this;
		}
		crawl(root) {
			return new APIBuilder(root || ".", this.options);
		}
		withGlobFunction(fn) {
			this.globFunction = fn;
			return this;
		}
		/**
		* @deprecated Pass options using the constructor instead:
		* ```ts
		* new fdir(options).crawl("/path/to/root");
		* ```
		* This method will be removed in v7.0
		*/
		/* c8 ignore next 4 */
		crawlWithOptions(root, options) {
			this.options = {
				...this.options,
				...options
			};
			return new APIBuilder(root || ".", this.options);
		}
		glob(...patterns) {
			if (this.globFunction) return this.globWithOptions(patterns);
			return this.globWithOptions(patterns, ...[{ dot: true }]);
		}
		globWithOptions(patterns, ...options) {
			const globFn = this.globFunction || pm;
			/* c8 ignore next 5 */
			if (!globFn) throw new Error("Please specify a glob function to use glob matching.");
			var isMatch = this.globCache[patterns.join("\0")];
			if (!isMatch) {
				isMatch = globFn(patterns, ...options);
				this.globCache[patterns.join("\0")] = isMatch;
			}
			this.options.filters.push((path) => isMatch(path));
			return this;
		}
	};
}));
//#endregion
//#region node_modules/picomatch/lib/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const WIN_SLASH = "\\\\/";
	const WIN_NO_SLASH = `[^${WIN_SLASH}]`;
	const DEFAULT_MAX_EXTGLOB_RECURSION = 0;
	/**
	* Posix glob regex
	*/
	const DOT_LITERAL = "\\.";
	const PLUS_LITERAL = "\\+";
	const QMARK_LITERAL = "\\?";
	const SLASH_LITERAL = "\\/";
	const ONE_CHAR = "(?=.)";
	const QMARK = "[^/]";
	const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
	const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
	const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
	const POSIX_CHARS = {
		DOT_LITERAL,
		PLUS_LITERAL,
		QMARK_LITERAL,
		SLASH_LITERAL,
		ONE_CHAR,
		QMARK,
		END_ANCHOR,
		DOTS_SLASH,
		NO_DOT: `(?!${DOT_LITERAL})`,
		NO_DOTS: `(?!${START_ANCHOR}${DOTS_SLASH})`,
		NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`,
		NO_DOTS_SLASH: `(?!${DOTS_SLASH})`,
		QMARK_NO_DOT: `[^.${SLASH_LITERAL}]`,
		STAR: `${QMARK}*?`,
		START_ANCHOR,
		SEP: "/"
	};
	/**
	* Windows glob regex
	*/
	const WINDOWS_CHARS = {
		...POSIX_CHARS,
		SLASH_LITERAL: `[${WIN_SLASH}]`,
		QMARK: WIN_NO_SLASH,
		STAR: `${WIN_NO_SLASH}*?`,
		DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
		NO_DOT: `(?!${DOT_LITERAL})`,
		NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
		NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
		NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
		QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
		START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
		END_ANCHOR: `(?:[${WIN_SLASH}]|$)`,
		SEP: "\\"
	};
	module.exports = {
		DEFAULT_MAX_EXTGLOB_RECURSION,
		MAX_LENGTH: 1024 * 64,
		POSIX_REGEX_SOURCE: {
			__proto__: null,
			alnum: "a-zA-Z0-9",
			alpha: "a-zA-Z",
			ascii: "\\x00-\\x7F",
			blank: " \\t",
			cntrl: "\\x00-\\x1F\\x7F",
			digit: "0-9",
			graph: "\\x21-\\x7E",
			lower: "a-z",
			print: "\\x20-\\x7E ",
			punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
			space: " \\t\\r\\n\\v\\f",
			upper: "A-Z",
			word: "A-Za-z0-9_",
			xdigit: "A-Fa-f0-9"
		},
		REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
		REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
		REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
		REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
		REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
		REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
		REPLACEMENTS: {
			__proto__: null,
			"***": "*",
			"**/**": "**",
			"**/**/**": "**"
		},
		CHAR_0: 48,
		CHAR_9: 57,
		CHAR_UPPERCASE_A: 65,
		CHAR_LOWERCASE_A: 97,
		CHAR_UPPERCASE_Z: 90,
		CHAR_LOWERCASE_Z: 122,
		CHAR_LEFT_PARENTHESES: 40,
		CHAR_RIGHT_PARENTHESES: 41,
		CHAR_ASTERISK: 42,
		CHAR_AMPERSAND: 38,
		CHAR_AT: 64,
		CHAR_BACKWARD_SLASH: 92,
		CHAR_CARRIAGE_RETURN: 13,
		CHAR_CIRCUMFLEX_ACCENT: 94,
		CHAR_COLON: 58,
		CHAR_COMMA: 44,
		CHAR_DOT: 46,
		CHAR_DOUBLE_QUOTE: 34,
		CHAR_EQUAL: 61,
		CHAR_EXCLAMATION_MARK: 33,
		CHAR_FORM_FEED: 12,
		CHAR_FORWARD_SLASH: 47,
		CHAR_GRAVE_ACCENT: 96,
		CHAR_HASH: 35,
		CHAR_HYPHEN_MINUS: 45,
		CHAR_LEFT_ANGLE_BRACKET: 60,
		CHAR_LEFT_CURLY_BRACE: 123,
		CHAR_LEFT_SQUARE_BRACKET: 91,
		CHAR_LINE_FEED: 10,
		CHAR_NO_BREAK_SPACE: 160,
		CHAR_PERCENT: 37,
		CHAR_PLUS: 43,
		CHAR_QUESTION_MARK: 63,
		CHAR_RIGHT_ANGLE_BRACKET: 62,
		CHAR_RIGHT_CURLY_BRACE: 125,
		CHAR_RIGHT_SQUARE_BRACKET: 93,
		CHAR_SEMICOLON: 59,
		CHAR_SINGLE_QUOTE: 39,
		CHAR_SPACE: 32,
		CHAR_TAB: 9,
		CHAR_UNDERSCORE: 95,
		CHAR_VERTICAL_LINE: 124,
		CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
		/**
		* Create EXTGLOB_CHARS
		*/
		extglobChars(chars) {
			return {
				"!": {
					type: "negate",
					open: "(?:(?!(?:",
					close: `))${chars.STAR})`
				},
				"?": {
					type: "qmark",
					open: "(?:",
					close: ")?"
				},
				"+": {
					type: "plus",
					open: "(?:",
					close: ")+"
				},
				"*": {
					type: "star",
					open: "(?:",
					close: ")*"
				},
				"@": {
					type: "at",
					open: "(?:",
					close: ")"
				}
			};
		},
		/**
		* Create GLOB_CHARS
		*/
		globChars(win32) {
			return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
		}
	};
}));
//#endregion
//#region node_modules/picomatch/lib/utils.js
var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
	const { REGEX_BACKSLASH, REGEX_REMOVE_BACKSLASH, REGEX_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_GLOBAL } = require_constants();
	exports.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
	exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
	exports.isRegexChar = (str) => str.length === 1 && exports.hasRegexChars(str);
	exports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
	exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
	exports.isWindows = () => {
		if (typeof navigator !== "undefined" && navigator.platform) {
			const platform = navigator.platform.toLowerCase();
			return platform === "win32" || platform === "windows";
		}
		if (typeof process !== "undefined" && process.platform) return process.platform === "win32";
		return false;
	};
	exports.removeBackslashes = (str) => {
		return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
			return match === "\\" ? "" : match;
		});
	};
	exports.escapeLast = (input, char, lastIdx) => {
		const idx = input.lastIndexOf(char, lastIdx);
		if (idx === -1) return input;
		if (input[idx - 1] === "\\") return exports.escapeLast(input, char, idx - 1);
		return `${input.slice(0, idx)}\\${input.slice(idx)}`;
	};
	exports.removePrefix = (input, state = {}) => {
		let output = input;
		if (output.startsWith("./")) {
			output = output.slice(2);
			state.prefix = "./";
		}
		return output;
	};
	exports.wrapOutput = (input, state = {}, options = {}) => {
		let output = `${options.contains ? "" : "^"}(?:${input})${options.contains ? "" : "$"}`;
		if (state.negated === true) output = `(?:^(?!${output}).*$)`;
		return output;
	};
	exports.basename = (path, { windows } = {}) => {
		const segs = path.split(windows ? /[\\/]/ : "/");
		const last = segs[segs.length - 1];
		if (last === "") return segs[segs.length - 2];
		return last;
	};
}));
//#endregion
//#region node_modules/picomatch/lib/scan.js
var require_scan = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const utils = require_utils();
	const { CHAR_ASTERISK, CHAR_AT, CHAR_BACKWARD_SLASH, CHAR_COMMA, CHAR_DOT, CHAR_EXCLAMATION_MARK, CHAR_FORWARD_SLASH, CHAR_LEFT_CURLY_BRACE, CHAR_LEFT_PARENTHESES, CHAR_LEFT_SQUARE_BRACKET, CHAR_PLUS, CHAR_QUESTION_MARK, CHAR_RIGHT_CURLY_BRACE, CHAR_RIGHT_PARENTHESES, CHAR_RIGHT_SQUARE_BRACKET } = require_constants();
	const isPathSeparator = (code) => {
		return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
	};
	const depth = (token) => {
		if (token.isPrefix !== true) token.depth = token.isGlobstar ? Infinity : 1;
	};
	/**
	* Quickly scans a glob pattern and returns an object with a handful of
	* useful properties, like `isGlob`, `path` (the leading non-glob, if it exists),
	* `glob` (the actual pattern), `negated` (true if the path starts with `!` but not
	* with `!(`) and `negatedExtglob` (true if the path starts with `!(`).
	*
	* ```js
	* const pm = require('picomatch');
	* console.log(pm.scan('foo/bar/*.js'));
	* { isGlob: true, input: 'foo/bar/*.js', base: 'foo/bar', glob: '*.js' }
	* ```
	* @param {String} `str`
	* @param {Object} `options`
	* @return {Object} Returns an object with tokens and regex source string.
	* @api public
	*/
	const scan = (input, options) => {
		const opts = options || {};
		const length = input.length - 1;
		const scanToEnd = opts.parts === true || opts.scanToEnd === true;
		const slashes = [];
		const tokens = [];
		const parts = [];
		let str = input;
		let index = -1;
		let start = 0;
		let lastIndex = 0;
		let isBrace = false;
		let isBracket = false;
		let isGlob = false;
		let isExtglob = false;
		let isGlobstar = false;
		let braceEscaped = false;
		let backslashes = false;
		let negated = false;
		let negatedExtglob = false;
		let finished = false;
		let braces = 0;
		let prev;
		let code;
		let token = {
			value: "",
			depth: 0,
			isGlob: false
		};
		const eos = () => index >= length;
		const peek = () => str.charCodeAt(index + 1);
		const advance = () => {
			prev = code;
			return str.charCodeAt(++index);
		};
		while (index < length) {
			code = advance();
			let next;
			if (code === CHAR_BACKWARD_SLASH) {
				backslashes = token.backslashes = true;
				code = advance();
				if (code === CHAR_LEFT_CURLY_BRACE) braceEscaped = true;
				continue;
			}
			if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
				braces++;
				while (eos() !== true && (code = advance())) {
					if (code === CHAR_BACKWARD_SLASH) {
						backslashes = token.backslashes = true;
						advance();
						continue;
					}
					if (code === CHAR_LEFT_CURLY_BRACE) {
						braces++;
						continue;
					}
					if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
						isBrace = token.isBrace = true;
						isGlob = token.isGlob = true;
						finished = true;
						if (scanToEnd === true) continue;
						break;
					}
					if (braceEscaped !== true && code === CHAR_COMMA) {
						isBrace = token.isBrace = true;
						isGlob = token.isGlob = true;
						finished = true;
						if (scanToEnd === true) continue;
						break;
					}
					if (code === CHAR_RIGHT_CURLY_BRACE) {
						braces--;
						if (braces === 0) {
							braceEscaped = false;
							isBrace = token.isBrace = true;
							finished = true;
							break;
						}
					}
				}
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_FORWARD_SLASH) {
				slashes.push(index);
				tokens.push(token);
				token = {
					value: "",
					depth: 0,
					isGlob: false
				};
				if (finished === true) continue;
				if (prev === CHAR_DOT && index === start + 1) {
					start += 2;
					continue;
				}
				lastIndex = index + 1;
				continue;
			}
			if (opts.noext !== true) {
				if ((code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK) === true && peek() === CHAR_LEFT_PARENTHESES) {
					isGlob = token.isGlob = true;
					isExtglob = token.isExtglob = true;
					finished = true;
					if (code === CHAR_EXCLAMATION_MARK && index === start) negatedExtglob = true;
					if (scanToEnd === true) {
						while (eos() !== true && (code = advance())) {
							if (code === CHAR_BACKWARD_SLASH) {
								backslashes = token.backslashes = true;
								code = advance();
								continue;
							}
							if (code === CHAR_RIGHT_PARENTHESES) {
								isGlob = token.isGlob = true;
								finished = true;
								break;
							}
						}
						continue;
					}
					break;
				}
			}
			if (code === CHAR_ASTERISK) {
				if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
				isGlob = token.isGlob = true;
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_QUESTION_MARK) {
				isGlob = token.isGlob = true;
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_LEFT_SQUARE_BRACKET) {
				while (eos() !== true && (next = advance())) {
					if (next === CHAR_BACKWARD_SLASH) {
						backslashes = token.backslashes = true;
						advance();
						continue;
					}
					if (next === CHAR_RIGHT_SQUARE_BRACKET) {
						isBracket = token.isBracket = true;
						isGlob = token.isGlob = true;
						finished = true;
						break;
					}
				}
				if (scanToEnd === true) continue;
				break;
			}
			if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
				negated = token.negated = true;
				start++;
				continue;
			}
			if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
				isGlob = token.isGlob = true;
				if (scanToEnd === true) {
					while (eos() !== true && (code = advance())) {
						if (code === CHAR_LEFT_PARENTHESES) {
							backslashes = token.backslashes = true;
							code = advance();
							continue;
						}
						if (code === CHAR_RIGHT_PARENTHESES) {
							finished = true;
							break;
						}
					}
					continue;
				}
				break;
			}
			if (isGlob === true) {
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
		}
		if (opts.noext === true) {
			isExtglob = false;
			isGlob = false;
		}
		let base = str;
		let prefix = "";
		let glob = "";
		if (start > 0) {
			prefix = str.slice(0, start);
			str = str.slice(start);
			lastIndex -= start;
		}
		if (base && isGlob === true && lastIndex > 0) {
			base = str.slice(0, lastIndex);
			glob = str.slice(lastIndex);
		} else if (isGlob === true) {
			base = "";
			glob = str;
		} else base = str;
		if (base && base !== "" && base !== "/" && base !== str) {
			if (isPathSeparator(base.charCodeAt(base.length - 1))) base = base.slice(0, -1);
		}
		if (opts.unescape === true) {
			if (glob) glob = utils.removeBackslashes(glob);
			if (base && backslashes === true) base = utils.removeBackslashes(base);
		}
		const state = {
			prefix,
			input,
			start,
			base,
			glob,
			isBrace,
			isBracket,
			isGlob,
			isExtglob,
			isGlobstar,
			negated,
			negatedExtglob
		};
		if (opts.tokens === true) {
			state.maxDepth = 0;
			if (!isPathSeparator(code)) tokens.push(token);
			state.tokens = tokens;
		}
		if (opts.parts === true || opts.tokens === true) {
			let prevIndex;
			for (let idx = 0; idx < slashes.length; idx++) {
				const n = prevIndex ? prevIndex + 1 : start;
				const i = slashes[idx];
				const value = input.slice(n, i);
				if (opts.tokens) {
					if (idx === 0 && start !== 0) {
						tokens[idx].isPrefix = true;
						tokens[idx].value = prefix;
					} else tokens[idx].value = value;
					depth(tokens[idx]);
					state.maxDepth += tokens[idx].depth;
				}
				if (idx !== 0 || value !== "") parts.push(value);
				prevIndex = i;
			}
			if (prevIndex && prevIndex + 1 < input.length) {
				const value = input.slice(prevIndex + 1);
				parts.push(value);
				if (opts.tokens) {
					tokens[tokens.length - 1].value = value;
					depth(tokens[tokens.length - 1]);
					state.maxDepth += tokens[tokens.length - 1].depth;
				}
			}
			state.slashes = slashes;
			state.parts = parts;
		}
		return state;
	};
	module.exports = scan;
}));
//#endregion
//#region node_modules/picomatch/lib/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const constants = require_constants();
	const utils = require_utils();
	/**
	* Constants
	*/
	const { MAX_LENGTH, POSIX_REGEX_SOURCE, REGEX_NON_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_BACKREF, REPLACEMENTS } = constants;
	/**
	* Helpers
	*/
	const expandRange = (args, options) => {
		if (typeof options.expandRange === "function") return options.expandRange(...args, options);
		args.sort();
		const value = `[${args.join("-")}]`;
		try {
			new RegExp(value);
		} catch (ex) {
			return args.map((v) => utils.escapeRegex(v)).join("..");
		}
		return value;
	};
	/**
	* Create the message for a syntax error
	*/
	const syntaxError = (type, char) => {
		return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
	};
	const splitTopLevel = (input) => {
		const parts = [];
		let bracket = 0;
		let paren = 0;
		let quote = 0;
		let value = "";
		let escaped = false;
		for (const ch of input) {
			if (escaped === true) {
				value += ch;
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				value += ch;
				escaped = true;
				continue;
			}
			if (ch === "\"") {
				quote = quote === 1 ? 0 : 1;
				value += ch;
				continue;
			}
			if (quote === 0) {
				if (ch === "[") bracket++;
				else if (ch === "]" && bracket > 0) bracket--;
				else if (bracket === 0) {
					if (ch === "(") paren++;
					else if (ch === ")" && paren > 0) paren--;
					else if (ch === "|" && paren === 0) {
						parts.push(value);
						value = "";
						continue;
					}
				}
			}
			value += ch;
		}
		parts.push(value);
		return parts;
	};
	const isPlainBranch = (branch) => {
		let escaped = false;
		for (const ch of branch) {
			if (escaped === true) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (/[?*+@!()[\]{}]/.test(ch)) return false;
		}
		return true;
	};
	const normalizeSimpleBranch = (branch) => {
		let value = branch.trim();
		let changed = true;
		while (changed === true) {
			changed = false;
			if (/^@\([^\\()[\]{}|]+\)$/.test(value)) {
				value = value.slice(2, -1);
				changed = true;
			}
		}
		if (!isPlainBranch(value)) return;
		return value.replace(/\\(.)/g, "$1");
	};
	const hasRepeatedCharPrefixOverlap = (branches) => {
		const values = branches.map(normalizeSimpleBranch).filter(Boolean);
		for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) {
			const a = values[i];
			const b = values[j];
			const char = a[0];
			if (!char || a !== char.repeat(a.length) || b !== char.repeat(b.length)) continue;
			if (a === b || a.startsWith(b) || b.startsWith(a)) return true;
		}
		return false;
	};
	const parseRepeatedExtglob = (pattern, requireEnd = true) => {
		if (pattern[0] !== "+" && pattern[0] !== "*" || pattern[1] !== "(") return;
		let bracket = 0;
		let paren = 0;
		let quote = 0;
		let escaped = false;
		for (let i = 1; i < pattern.length; i++) {
			const ch = pattern[i];
			if (escaped === true) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (ch === "\"") {
				quote = quote === 1 ? 0 : 1;
				continue;
			}
			if (quote === 1) continue;
			if (ch === "[") {
				bracket++;
				continue;
			}
			if (ch === "]" && bracket > 0) {
				bracket--;
				continue;
			}
			if (bracket > 0) continue;
			if (ch === "(") {
				paren++;
				continue;
			}
			if (ch === ")") {
				paren--;
				if (paren === 0) {
					if (requireEnd === true && i !== pattern.length - 1) return;
					return {
						type: pattern[0],
						body: pattern.slice(2, i),
						end: i
					};
				}
			}
		}
	};
	const getStarExtglobSequenceOutput = (pattern) => {
		let index = 0;
		const chars = [];
		while (index < pattern.length) {
			const match = parseRepeatedExtglob(pattern.slice(index), false);
			if (!match || match.type !== "*") return;
			const branches = splitTopLevel(match.body).map((branch) => branch.trim());
			if (branches.length !== 1) return;
			const branch = normalizeSimpleBranch(branches[0]);
			if (!branch || branch.length !== 1) return;
			chars.push(branch);
			index += match.end + 1;
		}
		if (chars.length < 1) return;
		return `${chars.length === 1 ? utils.escapeRegex(chars[0]) : `[${chars.map((ch) => utils.escapeRegex(ch)).join("")}]`}*`;
	};
	const repeatedExtglobRecursion = (pattern) => {
		let depth = 0;
		let value = pattern.trim();
		let match = parseRepeatedExtglob(value);
		while (match) {
			depth++;
			value = match.body.trim();
			match = parseRepeatedExtglob(value);
		}
		return depth;
	};
	const analyzeRepeatedExtglob = (body, options) => {
		if (options.maxExtglobRecursion === false) return { risky: false };
		const max = typeof options.maxExtglobRecursion === "number" ? options.maxExtglobRecursion : constants.DEFAULT_MAX_EXTGLOB_RECURSION;
		const branches = splitTopLevel(body).map((branch) => branch.trim());
		if (branches.length > 1) {
			if (branches.some((branch) => branch === "") || branches.some((branch) => /^[*?]+$/.test(branch)) || hasRepeatedCharPrefixOverlap(branches)) return { risky: true };
		}
		for (const branch of branches) {
			const safeOutput = getStarExtglobSequenceOutput(branch);
			if (safeOutput) return {
				risky: true,
				safeOutput
			};
			if (repeatedExtglobRecursion(branch) > max) return { risky: true };
		}
		return { risky: false };
	};
	/**
	* Parse the given input string.
	* @param {String} input
	* @param {Object} options
	* @return {Object}
	*/
	const parse = (input, options) => {
		if (typeof input !== "string") throw new TypeError("Expected a string");
		input = REPLACEMENTS[input] || input;
		const opts = { ...options };
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		let len = input.length;
		if (len > max) throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
		const bos = {
			type: "bos",
			value: "",
			output: opts.prepend || ""
		};
		const tokens = [bos];
		const capture = opts.capture ? "" : "?:";
		const PLATFORM_CHARS = constants.globChars(opts.windows);
		const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
		const { DOT_LITERAL, PLUS_LITERAL, SLASH_LITERAL, ONE_CHAR, DOTS_SLASH, NO_DOT, NO_DOT_SLASH, NO_DOTS_SLASH, QMARK, QMARK_NO_DOT, STAR, START_ANCHOR } = PLATFORM_CHARS;
		const globstar = (opts) => {
			return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
		};
		const nodot = opts.dot ? "" : NO_DOT;
		const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
		let star = opts.bash === true ? globstar(opts) : STAR;
		if (opts.capture) star = `(${star})`;
		if (typeof opts.noext === "boolean") opts.noextglob = opts.noext;
		const state = {
			input,
			index: -1,
			start: 0,
			dot: opts.dot === true,
			consumed: "",
			output: "",
			prefix: "",
			backtrack: false,
			negated: false,
			brackets: 0,
			braces: 0,
			parens: 0,
			quotes: 0,
			globstar: false,
			tokens
		};
		input = utils.removePrefix(input, state);
		len = input.length;
		const extglobs = [];
		const braces = [];
		const stack = [];
		let prev = bos;
		let value;
		/**
		* Tokenizing helpers
		*/
		const eos = () => state.index === len - 1;
		const peek = state.peek = (n = 1) => input[state.index + n];
		const advance = state.advance = () => input[++state.index] || "";
		const remaining = () => input.slice(state.index + 1);
		const consume = (value = "", num = 0) => {
			state.consumed += value;
			state.index += num;
		};
		const append = (token) => {
			state.output += token.output != null ? token.output : token.value;
			consume(token.value);
		};
		const negate = () => {
			let count = 1;
			while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
				advance();
				state.start++;
				count++;
			}
			if (count % 2 === 0) return false;
			state.negated = true;
			state.start++;
			return true;
		};
		const increment = (type) => {
			state[type]++;
			stack.push(type);
		};
		const decrement = (type) => {
			state[type]--;
			stack.pop();
		};
		/**
		* Push tokens onto the tokens array. This helper speeds up
		* tokenizing by 1) helping us avoid backtracking as much as possible,
		* and 2) helping us avoid creating extra tokens when consecutive
		* characters are plain text. This improves performance and simplifies
		* lookbehinds.
		*/
		const push = (tok) => {
			if (prev.type === "globstar") {
				const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
				const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
				if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
					state.output = state.output.slice(0, -prev.output.length);
					prev.type = "star";
					prev.value = "*";
					prev.output = star;
					state.output += prev.output;
				}
			}
			if (extglobs.length && tok.type !== "paren") extglobs[extglobs.length - 1].inner += tok.value;
			if (tok.value || tok.output) append(tok);
			if (prev && prev.type === "text" && tok.type === "text") {
				prev.output = (prev.output || prev.value) + tok.value;
				prev.value += tok.value;
				return;
			}
			tok.prev = prev;
			tokens.push(tok);
			prev = tok;
		};
		const extglobOpen = (type, value) => {
			const token = {
				...EXTGLOB_CHARS[value],
				conditions: 1,
				inner: ""
			};
			token.prev = prev;
			token.parens = state.parens;
			token.output = state.output;
			token.startIndex = state.index;
			token.tokensIndex = tokens.length;
			const output = (opts.capture ? "(" : "") + token.open;
			increment("parens");
			push({
				type,
				value,
				output: state.output ? "" : ONE_CHAR
			});
			push({
				type: "paren",
				extglob: true,
				value: advance(),
				output
			});
			extglobs.push(token);
		};
		const extglobClose = (token) => {
			const literal = input.slice(token.startIndex, state.index + 1);
			const analysis = analyzeRepeatedExtglob(input.slice(token.startIndex + 2, state.index), opts);
			if ((token.type === "plus" || token.type === "star") && analysis.risky) {
				const safeOutput = analysis.safeOutput ? (token.output ? "" : ONE_CHAR) + (opts.capture ? `(${analysis.safeOutput})` : analysis.safeOutput) : void 0;
				const open = tokens[token.tokensIndex];
				open.type = "text";
				open.value = literal;
				open.output = safeOutput || utils.escapeRegex(literal);
				for (let i = token.tokensIndex + 1; i < tokens.length; i++) {
					tokens[i].value = "";
					tokens[i].output = "";
					delete tokens[i].suffix;
				}
				state.output = token.output + open.output;
				state.backtrack = true;
				push({
					type: "paren",
					extglob: true,
					value,
					output: ""
				});
				decrement("parens");
				return;
			}
			let output = token.close + (opts.capture ? ")" : "");
			let rest;
			if (token.type === "negate") {
				let extglobStar = star;
				if (token.inner && token.inner.length > 1 && token.inner.includes("/")) extglobStar = globstar(opts);
				if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) output = token.close = `)$))${extglobStar}`;
				if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) output = token.close = `)${parse(rest, {
					...options,
					fastpaths: false
				}).output})${extglobStar})`;
				if (token.prev.type === "bos") state.negatedExtglob = true;
			}
			push({
				type: "paren",
				extglob: true,
				value,
				output
			});
			decrement("parens");
		};
		/**
		* Fast paths
		*/
		if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
			let backslashes = false;
			let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
				if (first === "\\") {
					backslashes = true;
					return m;
				}
				if (first === "?") {
					if (esc) return esc + first + (rest ? QMARK.repeat(rest.length) : "");
					if (index === 0) return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
					return QMARK.repeat(chars.length);
				}
				if (first === ".") return DOT_LITERAL.repeat(chars.length);
				if (first === "*") {
					if (esc) return esc + first + (rest ? star : "");
					return star;
				}
				return esc ? m : `\\${m}`;
			});
			if (backslashes === true) if (opts.unescape === true) output = output.replace(/\\/g, "");
			else output = output.replace(/\\+/g, (m) => {
				return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
			});
			if (output === input && opts.contains === true) {
				state.output = input;
				return state;
			}
			state.output = utils.wrapOutput(output, state, options);
			return state;
		}
		/**
		* Tokenize input until we reach end-of-string
		*/
		while (!eos()) {
			value = advance();
			if (value === "\0") continue;
			/**
			* Escaped characters
			*/
			if (value === "\\") {
				const next = peek();
				if (next === "/" && opts.bash !== true) continue;
				if (next === "." || next === ";") continue;
				if (!next) {
					value += "\\";
					push({
						type: "text",
						value
					});
					continue;
				}
				const match = /^\\+/.exec(remaining());
				let slashes = 0;
				if (match && match[0].length > 2) {
					slashes = match[0].length;
					state.index += slashes;
					if (slashes % 2 !== 0) value += "\\";
				}
				if (opts.unescape === true) value = advance();
				else value += advance();
				if (state.brackets === 0) {
					push({
						type: "text",
						value
					});
					continue;
				}
			}
			/**
			* If we're inside a regex character class, continue
			* until we reach the closing bracket.
			*/
			if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
				if (opts.posix !== false && value === ":") {
					const inner = prev.value.slice(1);
					if (inner.includes("[")) {
						prev.posix = true;
						if (inner.includes(":")) {
							const idx = prev.value.lastIndexOf("[");
							const pre = prev.value.slice(0, idx);
							const posix = POSIX_REGEX_SOURCE[prev.value.slice(idx + 2)];
							if (posix) {
								prev.value = pre + posix;
								state.backtrack = true;
								advance();
								if (!bos.output && tokens.indexOf(prev) === 1) bos.output = ONE_CHAR;
								continue;
							}
						}
					}
				}
				if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") value = `\\${value}`;
				if (value === "]" && (prev.value === "[" || prev.value === "[^")) value = `\\${value}`;
				if (opts.posix === true && value === "!" && prev.value === "[") value = "^";
				prev.value += value;
				append({ value });
				continue;
			}
			/**
			* If we're inside a quoted string, continue
			* until we reach the closing double quote.
			*/
			if (state.quotes === 1 && value !== "\"") {
				value = utils.escapeRegex(value);
				prev.value += value;
				append({ value });
				continue;
			}
			/**
			* Double quotes
			*/
			if (value === "\"") {
				state.quotes = state.quotes === 1 ? 0 : 1;
				if (opts.keepQuotes === true) push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Parentheses
			*/
			if (value === "(") {
				increment("parens");
				push({
					type: "paren",
					value
				});
				continue;
			}
			if (value === ")") {
				if (state.parens === 0 && opts.strictBrackets === true) throw new SyntaxError(syntaxError("opening", "("));
				const extglob = extglobs[extglobs.length - 1];
				if (extglob && state.parens === extglob.parens + 1) {
					extglobClose(extglobs.pop());
					continue;
				}
				push({
					type: "paren",
					value,
					output: state.parens ? ")" : "\\)"
				});
				decrement("parens");
				continue;
			}
			/**
			* Square brackets
			*/
			if (value === "[") {
				if (opts.nobracket === true || !remaining().includes("]")) {
					if (opts.nobracket !== true && opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
					value = `\\${value}`;
				} else increment("brackets");
				push({
					type: "bracket",
					value
				});
				continue;
			}
			if (value === "]") {
				if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
					push({
						type: "text",
						value,
						output: `\\${value}`
					});
					continue;
				}
				if (state.brackets === 0) {
					if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("opening", "["));
					push({
						type: "text",
						value,
						output: `\\${value}`
					});
					continue;
				}
				decrement("brackets");
				const prevValue = prev.value.slice(1);
				if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) value = `/${value}`;
				prev.value += value;
				append({ value });
				if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) continue;
				const escaped = utils.escapeRegex(prev.value);
				state.output = state.output.slice(0, -prev.value.length);
				if (opts.literalBrackets === true) {
					state.output += escaped;
					prev.value = escaped;
					continue;
				}
				prev.value = `(${capture}${escaped}|${prev.value})`;
				state.output += prev.value;
				continue;
			}
			/**
			* Braces
			*/
			if (value === "{" && opts.nobrace !== true) {
				increment("braces");
				const open = {
					type: "brace",
					value,
					output: "(",
					outputIndex: state.output.length,
					tokensIndex: state.tokens.length
				};
				braces.push(open);
				push(open);
				continue;
			}
			if (value === "}") {
				const brace = braces[braces.length - 1];
				if (opts.nobrace === true || !brace) {
					push({
						type: "text",
						value,
						output: value
					});
					continue;
				}
				let output = ")";
				if (brace.dots === true) {
					const arr = tokens.slice();
					const range = [];
					for (let i = arr.length - 1; i >= 0; i--) {
						tokens.pop();
						if (arr[i].type === "brace") break;
						if (arr[i].type !== "dots") range.unshift(arr[i].value);
					}
					output = expandRange(range, opts);
					state.backtrack = true;
				}
				if (brace.comma !== true && brace.dots !== true) {
					const out = state.output.slice(0, brace.outputIndex);
					const toks = state.tokens.slice(brace.tokensIndex);
					brace.value = brace.output = "\\{";
					value = output = "\\}";
					state.output = out;
					for (const t of toks) state.output += t.output || t.value;
				}
				push({
					type: "brace",
					value,
					output
				});
				decrement("braces");
				braces.pop();
				continue;
			}
			/**
			* Pipes
			*/
			if (value === "|") {
				if (extglobs.length > 0) extglobs[extglobs.length - 1].conditions++;
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Commas
			*/
			if (value === ",") {
				let output = value;
				const brace = braces[braces.length - 1];
				if (brace && stack[stack.length - 1] === "braces") {
					brace.comma = true;
					output = "|";
				}
				push({
					type: "comma",
					value,
					output
				});
				continue;
			}
			/**
			* Slashes
			*/
			if (value === "/") {
				if (prev.type === "dot" && state.index === state.start + 1) {
					state.start = state.index + 1;
					state.consumed = "";
					state.output = "";
					tokens.pop();
					prev = bos;
					continue;
				}
				push({
					type: "slash",
					value,
					output: SLASH_LITERAL
				});
				continue;
			}
			/**
			* Dots
			*/
			if (value === ".") {
				if (state.braces > 0 && prev.type === "dot") {
					if (prev.value === ".") prev.output = DOT_LITERAL;
					const brace = braces[braces.length - 1];
					prev.type = "dots";
					prev.output += value;
					prev.value += value;
					brace.dots = true;
					continue;
				}
				if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
					push({
						type: "text",
						value,
						output: DOT_LITERAL
					});
					continue;
				}
				push({
					type: "dot",
					value,
					output: DOT_LITERAL
				});
				continue;
			}
			/**
			* Question marks
			*/
			if (value === "?") {
				if (!(prev && prev.value === "(") && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					extglobOpen("qmark", value);
					continue;
				}
				if (prev && prev.type === "paren") {
					const next = peek();
					let output = value;
					if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) output = `\\${value}`;
					push({
						type: "text",
						value,
						output
					});
					continue;
				}
				if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
					push({
						type: "qmark",
						value,
						output: QMARK_NO_DOT
					});
					continue;
				}
				push({
					type: "qmark",
					value,
					output: QMARK
				});
				continue;
			}
			/**
			* Exclamation
			*/
			if (value === "!") {
				if (opts.noextglob !== true && peek() === "(") {
					if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
						extglobOpen("negate", value);
						continue;
					}
				}
				if (opts.nonegate !== true && state.index === 0) {
					negate();
					continue;
				}
			}
			/**
			* Plus
			*/
			if (value === "+") {
				if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					extglobOpen("plus", value);
					continue;
				}
				if (prev && prev.value === "(" || opts.regex === false) {
					push({
						type: "plus",
						value,
						output: PLUS_LITERAL
					});
					continue;
				}
				if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
					push({
						type: "plus",
						value
					});
					continue;
				}
				push({
					type: "plus",
					value: PLUS_LITERAL
				});
				continue;
			}
			/**
			* Plain text
			*/
			if (value === "@") {
				if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					push({
						type: "at",
						extglob: true,
						value,
						output: ""
					});
					continue;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Plain text
			*/
			if (value !== "*") {
				if (value === "$" || value === "^") value = `\\${value}`;
				const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
				if (match) {
					value += match[0];
					state.index += match[0].length;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Stars
			*/
			if (prev && (prev.type === "globstar" || prev.star === true)) {
				prev.type = "star";
				prev.star = true;
				prev.value += value;
				prev.output = star;
				state.backtrack = true;
				state.globstar = true;
				consume(value);
				continue;
			}
			let rest = remaining();
			if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
				extglobOpen("star", value);
				continue;
			}
			if (prev.type === "star") {
				if (opts.noglobstar === true) {
					consume(value);
					continue;
				}
				const prior = prev.prev;
				const before = prior.prev;
				const isStart = prior.type === "slash" || prior.type === "bos";
				const afterStar = before && (before.type === "star" || before.type === "globstar");
				if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
					push({
						type: "star",
						value,
						output: ""
					});
					continue;
				}
				const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
				const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
				if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
					push({
						type: "star",
						value,
						output: ""
					});
					continue;
				}
				while (rest.slice(0, 3) === "/**") {
					const after = input[state.index + 4];
					if (after && after !== "/") break;
					rest = rest.slice(3);
					consume("/**", 3);
				}
				if (prior.type === "bos" && eos()) {
					prev.type = "globstar";
					prev.value += value;
					prev.output = globstar(opts);
					state.output = prev.output;
					state.globstar = true;
					consume(value);
					continue;
				}
				if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
					state.output = state.output.slice(0, -(prior.output + prev.output).length);
					prior.output = `(?:${prior.output}`;
					prev.type = "globstar";
					prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
					prev.value += value;
					state.globstar = true;
					state.output += prior.output + prev.output;
					consume(value);
					continue;
				}
				if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
					const end = rest[1] !== void 0 ? "|$" : "";
					state.output = state.output.slice(0, -(prior.output + prev.output).length);
					prior.output = `(?:${prior.output}`;
					prev.type = "globstar";
					prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
					prev.value += value;
					state.output += prior.output + prev.output;
					state.globstar = true;
					consume(value + advance());
					push({
						type: "slash",
						value: "/",
						output: ""
					});
					continue;
				}
				if (prior.type === "bos" && rest[0] === "/") {
					prev.type = "globstar";
					prev.value += value;
					prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
					state.output = prev.output;
					state.globstar = true;
					consume(value + advance());
					push({
						type: "slash",
						value: "/",
						output: ""
					});
					continue;
				}
				state.output = state.output.slice(0, -prev.output.length);
				prev.type = "globstar";
				prev.output = globstar(opts);
				prev.value += value;
				state.output += prev.output;
				state.globstar = true;
				consume(value);
				continue;
			}
			const token = {
				type: "star",
				value,
				output: star
			};
			if (opts.bash === true) {
				token.output = ".*?";
				if (prev.type === "bos" || prev.type === "slash") token.output = nodot + token.output;
				push(token);
				continue;
			}
			if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
				token.output = value;
				push(token);
				continue;
			}
			if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
				if (prev.type === "dot") {
					state.output += NO_DOT_SLASH;
					prev.output += NO_DOT_SLASH;
				} else if (opts.dot === true) {
					state.output += NO_DOTS_SLASH;
					prev.output += NO_DOTS_SLASH;
				} else {
					state.output += nodot;
					prev.output += nodot;
				}
				if (peek() !== "*") {
					state.output += ONE_CHAR;
					prev.output += ONE_CHAR;
				}
			}
			push(token);
		}
		while (state.brackets > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
			state.output = utils.escapeLast(state.output, "[");
			decrement("brackets");
		}
		while (state.parens > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", ")"));
			state.output = utils.escapeLast(state.output, "(");
			decrement("parens");
		}
		while (state.braces > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "}"));
			state.output = utils.escapeLast(state.output, "{");
			decrement("braces");
		}
		if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) push({
			type: "maybe_slash",
			value: "",
			output: `${SLASH_LITERAL}?`
		});
		if (state.backtrack === true) {
			state.output = "";
			for (const token of state.tokens) {
				state.output += token.output != null ? token.output : token.value;
				if (token.suffix) state.output += token.suffix;
			}
		}
		return state;
	};
	/**
	* Fast paths for creating regular expressions for common glob patterns.
	* This can significantly speed up processing and has very little downside
	* impact when none of the fast paths match.
	*/
	parse.fastpaths = (input, options) => {
		const opts = { ...options };
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		const len = input.length;
		if (len > max) throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
		input = REPLACEMENTS[input] || input;
		const { DOT_LITERAL, SLASH_LITERAL, ONE_CHAR, DOTS_SLASH, NO_DOT, NO_DOTS, NO_DOTS_SLASH, STAR, START_ANCHOR } = constants.globChars(opts.windows);
		const nodot = opts.dot ? NO_DOTS : NO_DOT;
		const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
		const capture = opts.capture ? "" : "?:";
		const state = {
			negated: false,
			prefix: ""
		};
		let star = opts.bash === true ? ".*?" : STAR;
		if (opts.capture) star = `(${star})`;
		const globstar = (opts) => {
			if (opts.noglobstar === true) return star;
			return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
		};
		const create = (str) => {
			switch (str) {
				case "*": return `${nodot}${ONE_CHAR}${star}`;
				case ".*": return `${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "*.*": return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "*/*": return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
				case "**": return nodot + globstar(opts);
				case "**/*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
				case "**/*.*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "**/.*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
				default: {
					const match = /^(.*?)\.(\w+)$/.exec(str);
					if (!match) return;
					const source = create(match[1]);
					if (!source) return;
					return source + DOT_LITERAL + match[2];
				}
			}
		};
		let source = create(utils.removePrefix(input, state));
		if (source && opts.strictSlashes !== true) source += `${SLASH_LITERAL}?`;
		return source;
	};
	module.exports = parse;
}));
//#endregion
//#region node_modules/picomatch/lib/picomatch.js
var require_picomatch$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const scan = require_scan();
	const parse = require_parse();
	const utils = require_utils();
	const constants = require_constants();
	const isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
	/**
	* Creates a matcher function from one or more glob patterns. The
	* returned function takes a string to match as its first argument,
	* and returns true if the string is a match. The returned matcher
	* function also takes a boolean as the second argument that, when true,
	* returns an object with additional information.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch(glob[, options]);
	*
	* const isMatch = picomatch('*.!(*a)');
	* console.log(isMatch('a.a')); //=> false
	* console.log(isMatch('a.b')); //=> true
	* ```
	* @name picomatch
	* @param {String|Array} `globs` One or more glob patterns.
	* @param {Object=} `options`
	* @return {Function=} Returns a matcher function.
	* @api public
	*/
	const picomatch = (glob, options, returnState = false) => {
		if (Array.isArray(glob)) {
			const fns = glob.map((input) => picomatch(input, options, returnState));
			const arrayMatcher = (str) => {
				for (const isMatch of fns) {
					const state = isMatch(str);
					if (state) return state;
				}
				return false;
			};
			return arrayMatcher;
		}
		const isState = isObject(glob) && glob.tokens && glob.input;
		if (glob === "" || typeof glob !== "string" && !isState) throw new TypeError("Expected pattern to be a non-empty string");
		const opts = options || {};
		const posix = opts.windows;
		const regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, false, true);
		const state = regex.state;
		delete regex.state;
		let isIgnored = () => false;
		if (opts.ignore) {
			const ignoreOpts = {
				...options,
				ignore: null,
				onMatch: null,
				onResult: null
			};
			isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
		}
		const matcher = (input, returnObject = false) => {
			const { isMatch, match, output } = picomatch.test(input, regex, options, {
				glob,
				posix
			});
			const result = {
				glob,
				state,
				regex,
				posix,
				input,
				output,
				match,
				isMatch
			};
			if (typeof opts.onResult === "function") opts.onResult(result);
			if (isMatch === false) {
				result.isMatch = false;
				return returnObject ? result : false;
			}
			if (isIgnored(input)) {
				if (typeof opts.onIgnore === "function") opts.onIgnore(result);
				result.isMatch = false;
				return returnObject ? result : false;
			}
			if (typeof opts.onMatch === "function") opts.onMatch(result);
			return returnObject ? result : true;
		};
		if (returnState) matcher.state = state;
		return matcher;
	};
	/**
	* Test `input` with the given `regex`. This is used by the main
	* `picomatch()` function to test the input string.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.test(input, regex[, options]);
	*
	* console.log(picomatch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
	* // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
	* ```
	* @param {String} `input` String to test.
	* @param {RegExp} `regex`
	* @return {Object} Returns an object with matching info.
	* @api public
	*/
	picomatch.test = (input, regex, options, { glob, posix } = {}) => {
		if (typeof input !== "string") throw new TypeError("Expected input to be a string");
		if (input === "") return {
			isMatch: false,
			output: ""
		};
		const opts = options || {};
		const format = opts.format || (posix ? utils.toPosixSlashes : null);
		let match = input === glob;
		let output = match && format ? format(input) : input;
		if (match === false) {
			output = format ? format(input) : input;
			match = output === glob;
		}
		if (match === false || opts.capture === true) if (opts.matchBase === true || opts.basename === true) match = picomatch.matchBase(input, regex, options, posix);
		else match = regex.exec(output);
		return {
			isMatch: Boolean(match),
			match,
			output
		};
	};
	/**
	* Match the basename of a filepath.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.matchBase(input, glob[, options]);
	* console.log(picomatch.matchBase('foo/bar.js', '*.js'); // true
	* ```
	* @param {String} `input` String to test.
	* @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
	* @return {Boolean}
	* @api public
	*/
	picomatch.matchBase = (input, glob, options) => {
		return (glob instanceof RegExp ? glob : picomatch.makeRe(glob, options)).test(utils.basename(input));
	};
	/**
	* Returns true if **any** of the given glob `patterns` match the specified `string`.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.isMatch(string, patterns[, options]);
	*
	* console.log(picomatch.isMatch('a.a', ['b.*', '*.a'])); //=> true
	* console.log(picomatch.isMatch('a.a', 'b.*')); //=> false
	* ```
	* @param {String|Array} str The string to test.
	* @param {String|Array} patterns One or more glob patterns to use for matching.
	* @param {Object} [options] See available [options](#options).
	* @return {Boolean} Returns true if any patterns match `str`
	* @api public
	*/
	picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
	/**
	* Parse a glob pattern to create the source string for a regular
	* expression.
	*
	* ```js
	* const picomatch = require('picomatch');
	* const result = picomatch.parse(pattern[, options]);
	* ```
	* @param {String} `pattern`
	* @param {Object} `options`
	* @return {Object} Returns an object with useful properties and output to be used as a regex source string.
	* @api public
	*/
	picomatch.parse = (pattern, options) => {
		if (Array.isArray(pattern)) return pattern.map((p) => picomatch.parse(p, options));
		return parse(pattern, {
			...options,
			fastpaths: false
		});
	};
	/**
	* Scan a glob pattern to separate the pattern into segments.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.scan(input[, options]);
	*
	* const result = picomatch.scan('!./foo/*.js');
	* console.log(result);
	* { prefix: '!./',
	*   input: '!./foo/*.js',
	*   start: 3,
	*   base: 'foo',
	*   glob: '*.js',
	*   isBrace: false,
	*   isBracket: false,
	*   isGlob: true,
	*   isExtglob: false,
	*   isGlobstar: false,
	*   negated: true }
	* ```
	* @param {String} `input` Glob pattern to scan.
	* @param {Object} `options`
	* @return {Object} Returns an object with
	* @api public
	*/
	picomatch.scan = (input, options) => scan(input, options);
	/**
	* Compile a regular expression from the `state` object returned by the
	* [parse()](#parse) method.
	*
	* ```js
	* const picomatch = require('picomatch');
	* const state = picomatch.parse('*.js');
	* // picomatch.compileRe(state[, options]);
	*
	* console.log(picomatch.compileRe(state));
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {Object} `state`
	* @param {Object} `options`
	* @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
	* @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
	* @return {RegExp}
	* @api public
	*/
	picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
		if (returnOutput === true) return state.output;
		const opts = options || {};
		const prepend = opts.contains ? "" : "^";
		const append = opts.contains ? "" : "$";
		let source = `${prepend}(?:${state.output})${append}`;
		if (state && state.negated === true) source = `^(?!${source}).*$`;
		const regex = picomatch.toRegex(source, options);
		if (returnState === true) regex.state = state;
		return regex;
	};
	/**
	* Create a regular expression from a parsed glob pattern.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.makeRe(state[, options]);
	*
	* const result = picomatch.makeRe('*.js');
	* console.log(result);
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {String} `state` The object returned from the `.parse` method.
	* @param {Object} `options`
	* @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
	* @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
	* @return {RegExp} Returns a regex created from the given pattern.
	* @api public
	*/
	picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
		if (!input || typeof input !== "string") throw new TypeError("Expected a non-empty string");
		let parsed = {
			negated: false,
			fastpaths: true
		};
		if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) parsed.output = parse.fastpaths(input, options);
		if (!parsed.output) parsed = parse(input, options);
		return picomatch.compileRe(parsed, options, returnOutput, returnState);
	};
	/**
	* Create a regular expression from the given regex source string.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.toRegex(source[, options]);
	*
	* const { output } = picomatch.parse('*.js');
	* console.log(picomatch.toRegex(output));
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {String} `source` Regular expression source string.
	* @param {Object} `options`
	* @return {RegExp}
	* @api public
	*/
	picomatch.toRegex = (source, options) => {
		try {
			const opts = options || {};
			return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
		} catch (err) {
			if (options && options.debug === true) throw err;
			return /$^/;
		}
	};
	/**
	* Picomatch constants.
	* @return {Object}
	*/
	picomatch.constants = constants;
	/**
	* Expose "picomatch"
	*/
	module.exports = picomatch;
}));
//#endregion
//#region node_modules/picomatch/index.js
var require_picomatch = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const pico = require_picomatch$1();
	const utils = require_utils();
	function picomatch(glob, options, returnState = false) {
		if (options && (options.windows === null || options.windows === void 0)) options = {
			...options,
			windows: utils.isWindows()
		};
		return pico(glob, options, returnState);
	}
	Object.assign(picomatch, pico);
	module.exports = picomatch;
}));
//#endregion
//#region node_modules/tinyglobby/dist/index.mjs
function getPartialMatcher(patterns, options = {}) {
	const patternsCount = patterns.length;
	const patternsParts = Array(patternsCount);
	const matchers = Array(patternsCount);
	let i, j;
	for (i = 0; i < patternsCount; i++) {
		const parts = splitPattern(patterns[i]);
		patternsParts[i] = parts;
		const partsCount = parts.length;
		const partMatchers = Array(partsCount);
		for (j = 0; j < partsCount; j++) partMatchers[j] = (0, import_picomatch.default)(parts[j], options);
		matchers[i] = partMatchers;
	}
	return (input) => {
		const inputParts = input.split("/");
		if (inputParts[0] === ".." && ONLY_PARENT_DIRECTORIES.test(input)) return true;
		for (i = 0; i < patternsCount; i++) {
			const patternParts = patternsParts[i];
			const matcher = matchers[i];
			const inputPatternCount = inputParts.length;
			const minParts = Math.min(inputPatternCount, patternParts.length);
			j = 0;
			while (j < minParts) {
				const part = patternParts[j];
				if (part.includes("/")) return true;
				if (!matcher[j](inputParts[j])) break;
				if (!options.noglobstar && part === "**") return true;
				j++;
			}
			if (j === inputPatternCount) return true;
		}
		return false;
	};
}
function buildFormat(cwd, root, absolute) {
	if (cwd === root || root.startsWith(`${cwd}/`)) {
		if (absolute) {
			const start = cwd.length + +!isRoot(cwd);
			return (p, isDir) => p.slice(start, isDir ? -1 : void 0) || ".";
		}
		const prefix = root.slice(cwd.length + 1);
		if (prefix) return (p, isDir) => {
			if (p === ".") return prefix;
			const result = `${prefix}/${p}`;
			return isDir ? result.slice(0, -1) : result;
		};
		return (p, isDir) => isDir && p !== "." ? p.slice(0, -1) : p;
	}
	if (absolute) return (p) => posix.relative(cwd, p) || ".";
	return (p) => posix.relative(cwd, `${root}/${p}`) || ".";
}
function buildRelative(cwd, root) {
	if (root.startsWith(`${cwd}/`)) {
		const prefix = root.slice(cwd.length + 1);
		return (p) => `${prefix}/${p}`;
	}
	return (p) => {
		const result = posix.relative(cwd, `${root}/${p}`);
		return p[p.length - 1] === "/" && result !== "" ? `${result}/` : result || ".";
	};
}
function ensureNonDriveRelativePath(path) {
	return path.replace(DRIVE_RELATIVE_PATH, (match) => `${match}/`);
}
function splitPattern(path) {
	var _result$parts;
	const result = import_picomatch.default.scan(path, splitPatternOptions);
	return ((_result$parts = result.parts) === null || _result$parts === void 0 ? void 0 : _result$parts.length) ? result.parts : [path];
}
/**
* Checks if a pattern has dynamic parts.
*
* Has a few minor differences with [`fast-glob`](https://github.com/mrmlnc/fast-glob) for better accuracy:
*
* - Doesn't necessarily return `false` on patterns that include `\`.
* - Returns `true` if the pattern includes parentheses, regardless of them representing one single pattern or not.
* - Returns `true` for unfinished glob extensions i.e. `(h`, `+(h`.
* - Returns `true` for unfinished brace expansions as long as they include `,` or `..`.
*
* @see {@link https://superchupu.dev/tinyglobby/documentation#isDynamicPattern}
*/
function isDynamicPattern(pattern, options) {
	if ((options === null || options === void 0 ? void 0 : options.caseSensitiveMatch) === false) return true;
	const scan = import_picomatch.default.scan(pattern);
	return scan.isGlob || scan.negated;
}
function log$1(...tasks) {
	console.log(`[tinyglobby ${(/* @__PURE__ */ new Date()).toLocaleTimeString("es")}]`, ...tasks);
}
function ensureStringArray(value) {
	return typeof value === "string" ? [value] : value !== null && value !== void 0 ? value : [];
}
function normalizePattern(pattern, opts, props, isIgnore) {
	var _PARENT_DIRECTORY$exe;
	const cwd = opts.cwd;
	let result = pattern;
	if (pattern[pattern.length - 1] === "/") result = pattern.slice(0, -1);
	if (result[result.length - 1] !== "*" && opts.expandDirectories) result += "/**";
	const escapedCwd = escapePath(cwd);
	result = isAbsolute(result.replace(ESCAPING_BACKSLASHES, "")) ? posix.relative(escapedCwd, result) : posix.normalize(result);
	const parentDir = (_PARENT_DIRECTORY$exe = PARENT_DIRECTORY.exec(result)) === null || _PARENT_DIRECTORY$exe === void 0 ? void 0 : _PARENT_DIRECTORY$exe[0];
	const parts = splitPattern(result);
	if (parentDir) {
		const n = (parentDir.length + 1) / 3;
		let i = 0;
		const cwdParts = escapedCwd.split("/");
		while (i < n && parts[i + n] === cwdParts[cwdParts.length + i - n]) {
			result = result.slice(0, (n - i - 1) * 3) + result.slice((n - i) * 3 + parts[i + n].length + 1) || ".";
			i++;
		}
		const potentialRoot = posix.join(cwd, parentDir.slice(i * 3));
		if (potentialRoot[0] !== "." && props.root.length > potentialRoot.length) {
			props.root = ensureNonDriveRelativePath(potentialRoot);
			props.depthOffset = -n + i;
		}
	}
	if (!isIgnore && props.depthOffset >= 0) {
		var _props$commonPath;
		(_props$commonPath = props.commonPath) !== null && _props$commonPath !== void 0 || (props.commonPath = parts);
		const newCommonPath = [];
		const length = Math.min(props.commonPath.length, parts.length);
		for (let i = 0; i < length; i++) {
			const part = parts[i];
			if (part === "**" && !parts[i + 1]) {
				newCommonPath.pop();
				break;
			}
			if (i === parts.length - 1 || part !== props.commonPath[i] || isDynamicPattern(part)) break;
			newCommonPath.push(part);
		}
		props.depthOffset = newCommonPath.length;
		props.commonPath = newCommonPath;
		props.root = ensureNonDriveRelativePath(newCommonPath.length > 0 ? posix.join(cwd, ...newCommonPath) : cwd);
	}
	return result;
}
function processPatterns(options, patterns, props) {
	const matchPatterns = [];
	const ignorePatterns = [];
	for (const pattern of options.ignore) {
		if (!pattern) continue;
		if (pattern[0] !== "!" || pattern[1] === "(") ignorePatterns.push(normalizePattern(pattern, options, props, true));
	}
	for (const pattern of patterns) {
		if (!pattern) continue;
		if (pattern[0] !== "!" || pattern[1] === "(") matchPatterns.push(normalizePattern(pattern, options, props, false));
		else if (pattern[1] !== "!" || pattern[2] === "(") ignorePatterns.push(normalizePattern(pattern.slice(1), options, props, true));
	}
	return {
		match: matchPatterns,
		ignore: ignorePatterns
	};
}
function buildCrawler(options, patterns) {
	const cwd = options.cwd;
	const props = {
		root: cwd,
		depthOffset: 0
	};
	const processed = processPatterns(options, patterns, props);
	if (options.debug) log$1("internal processing patterns:", processed);
	const { absolute, caseSensitiveMatch, debug, dot, followSymbolicLinks, onlyDirectories } = options;
	const root = props.root.replace(BACKSLASHES, "");
	const matchOptions = {
		dot,
		nobrace: options.braceExpansion === false,
		nocase: !caseSensitiveMatch,
		noextglob: options.extglob === false,
		noglobstar: options.globstar === false,
		posix: true
	};
	const matcher = (0, import_picomatch.default)(processed.match, matchOptions);
	const ignore = (0, import_picomatch.default)(processed.ignore, matchOptions);
	const partialMatcher = getPartialMatcher(processed.match, matchOptions);
	const format = buildFormat(cwd, root, absolute);
	const excludeFormatter = absolute ? format : buildFormat(cwd, root, true);
	const excludePredicate = (_, p) => {
		const relativePath = excludeFormatter(p, true);
		return relativePath !== "." && !partialMatcher(relativePath) || ignore(relativePath);
	};
	let maxDepth;
	if (options.deep !== void 0) maxDepth = Math.round(options.deep - props.depthOffset);
	const crawler = new Builder({
		filters: [debug ? (p, isDirectory) => {
			const path = format(p, isDirectory);
			const matches = matcher(path) && !ignore(path);
			if (matches) log$1(`matched ${path}`);
			return matches;
		} : (p, isDirectory) => {
			const path = format(p, isDirectory);
			return matcher(path) && !ignore(path);
		}],
		exclude: debug ? (_, p) => {
			const skipped = excludePredicate(_, p);
			log$1(`${skipped ? "skipped" : "crawling"} ${p}`);
			return skipped;
		} : excludePredicate,
		fs: options.fs,
		pathSeparator: "/",
		relativePaths: !absolute,
		resolvePaths: absolute,
		includeBasePath: absolute,
		resolveSymlinks: followSymbolicLinks,
		excludeSymlinks: !followSymbolicLinks,
		excludeFiles: onlyDirectories,
		includeDirs: onlyDirectories || !options.onlyFiles,
		maxDepth,
		signal: options.signal
	}).crawl(root);
	if (options.debug) log$1("internal properties:", {
		...props,
		root
	});
	return [crawler, cwd !== root && !absolute && buildRelative(cwd, root)];
}
function formatPaths(paths, mapper) {
	if (mapper) for (let i = paths.length - 1; i >= 0; i--) paths[i] = mapper(paths[i]);
	return paths;
}
function getOptions(options) {
	const opts = Object.assign({}, options);
	for (const key in defaultOptions) if (opts[key] === void 0) Object.assign(opts, { [key]: defaultOptions[key] });
	opts.cwd = (opts.cwd instanceof URL ? fileURLToPath$1(opts.cwd) : resolve(opts.cwd || process.cwd())).replace(BACKSLASHES, "/");
	opts.ignore = ensureStringArray(opts.ignore);
	opts.fs && (opts.fs = {
		readdir: opts.fs.readdir || readdir$1,
		readdirSync: opts.fs.readdirSync || readdirSync$1,
		realpath: opts.fs.realpath || realpath,
		realpathSync: opts.fs.realpathSync || realpathSync$1,
		stat: opts.fs.stat || stat,
		statSync: opts.fs.statSync || statSync$1
	});
	if (opts.debug) log$1("globbing with options:", opts);
	return opts;
}
function getCrawler(globInput, inputOptions = {}) {
	var _ref;
	if (globInput && (inputOptions === null || inputOptions === void 0 ? void 0 : inputOptions.patterns)) throw new Error("Cannot pass patterns as both an argument and an option");
	const isModern = isReadonlyArray(globInput) || typeof globInput === "string";
	const patterns = ensureStringArray((_ref = isModern ? globInput : globInput.patterns) !== null && _ref !== void 0 ? _ref : "**/*");
	const options = getOptions(isModern ? inputOptions : globInput);
	return patterns.length > 0 ? buildCrawler(options, patterns) : [];
}
async function glob(globInput, options) {
	const [crawler, relative] = getCrawler(globInput, options);
	return crawler ? formatPaths(await crawler.withPromise(), relative) : [];
}
var import_picomatch, isReadonlyArray, BACKSLASHES, DRIVE_RELATIVE_PATH, isWin, ONLY_PARENT_DIRECTORIES, WIN32_ROOT_DIR, isRoot, splitPatternOptions, POSIX_UNESCAPED_GLOB_SYMBOLS, WIN32_UNESCAPED_GLOB_SYMBOLS, escapePosixPath, escapeWin32Path, escapePath, PARENT_DIRECTORY, ESCAPING_BACKSLASHES, defaultOptions;
var init_dist$4 = __esmMin((() => {
	init_dist$5();
	import_picomatch = /* @__PURE__ */ __toESM(require_picomatch(), 1);
	isReadonlyArray = Array.isArray;
	BACKSLASHES = /\\/g;
	DRIVE_RELATIVE_PATH = /^[A-Za-z]:$/;
	isWin = process.platform === "win32";
	ONLY_PARENT_DIRECTORIES = /^(\/?\.\.)+$/;
	WIN32_ROOT_DIR = /^[A-Z]:\/$/i;
	isRoot = isWin ? (p) => WIN32_ROOT_DIR.test(p) : (p) => p === "/";
	splitPatternOptions = { parts: true };
	POSIX_UNESCAPED_GLOB_SYMBOLS = /(?<!\\)([()[\]{}*?|]|^!|[!+@](?=\()|\\(?![()[\]{}!*+?@|]))/g;
	WIN32_UNESCAPED_GLOB_SYMBOLS = /(?<!\\)([()[\]{}]|^!|[!+@](?=\())/g;
	escapePosixPath = (path) => path.replace(POSIX_UNESCAPED_GLOB_SYMBOLS, "\\$&");
	escapeWin32Path = (path) => path.replace(WIN32_UNESCAPED_GLOB_SYMBOLS, "\\$&");
	escapePath = isWin ? escapeWin32Path : escapePosixPath;
	PARENT_DIRECTORY = /^(\/?\.\.)+/;
	ESCAPING_BACKSLASHES = /\\(?=[()[\]{}!*+?@|])/g;
	defaultOptions = {
		caseSensitiveMatch: true,
		debug: !!process.env.TINYGLOBBY_DEBUG,
		expandDirectories: true,
		followSymbolicLinks: true,
		onlyFiles: true
	};
}));
//#endregion
//#region node_modules/js-yaml/dist/js-yaml.mjs
function getDefaultExportFromCjs(x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function requireCommon() {
	if (hasRequiredCommon) return common;
	hasRequiredCommon = 1;
	function isNothing(subject) {
		return typeof subject === "undefined" || subject === null;
	}
	function isObject(subject) {
		return typeof subject === "object" && subject !== null;
	}
	function toArray(sequence) {
		if (Array.isArray(sequence)) return sequence;
		else if (isNothing(sequence)) return [];
		return [sequence];
	}
	function extend(target, source) {
		if (source) {
			const sourceKeys = Object.keys(source);
			for (let index = 0, length = sourceKeys.length; index < length; index += 1) {
				const key = sourceKeys[index];
				target[key] = source[key];
			}
		}
		return target;
	}
	function repeat(string, count) {
		let result = "";
		for (let cycle = 0; cycle < count; cycle += 1) result += string;
		return result;
	}
	function isNegativeZero(number) {
		return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
	}
	common.isNothing = isNothing;
	common.isObject = isObject;
	common.toArray = toArray;
	common.repeat = repeat;
	common.isNegativeZero = isNegativeZero;
	common.extend = extend;
	return common;
}
function requireException() {
	if (hasRequiredException) return exception;
	hasRequiredException = 1;
	function formatError(exception2, compact) {
		let where = "";
		const message = exception2.reason || "(unknown reason)";
		if (!exception2.mark) return message;
		if (exception2.mark.name) where += "in \"" + exception2.mark.name + "\" ";
		where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
		if (!compact && exception2.mark.snippet) where += "\n\n" + exception2.mark.snippet;
		return message + " " + where;
	}
	function YAMLException2(reason, mark) {
		Error.call(this);
		this.name = "YAMLException";
		this.reason = reason;
		this.mark = mark;
		this.message = formatError(this, false);
		if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
		else this.stack = (/* @__PURE__ */ new Error()).stack || "";
	}
	YAMLException2.prototype = Object.create(Error.prototype);
	YAMLException2.prototype.constructor = YAMLException2;
	YAMLException2.prototype.toString = function toString(compact) {
		return this.name + ": " + formatError(this, compact);
	};
	exception = YAMLException2;
	return exception;
}
function requireSnippet() {
	if (hasRequiredSnippet) return snippet;
	hasRequiredSnippet = 1;
	const common2 = requireCommon();
	function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
		let head = "";
		let tail = "";
		const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
		if (position - lineStart > maxHalfLength) {
			head = " ... ";
			lineStart = position - maxHalfLength + head.length;
		}
		if (lineEnd - position > maxHalfLength) {
			tail = " ...";
			lineEnd = position + maxHalfLength - tail.length;
		}
		return {
			str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
			pos: position - lineStart + head.length
		};
	}
	function padStart(string, max) {
		return common2.repeat(" ", max - string.length) + string;
	}
	function makeSnippet(mark, options) {
		options = Object.create(options || null);
		if (!mark.buffer) return null;
		if (!options.maxLength) options.maxLength = 79;
		if (typeof options.indent !== "number") options.indent = 1;
		if (typeof options.linesBefore !== "number") options.linesBefore = 3;
		if (typeof options.linesAfter !== "number") options.linesAfter = 2;
		const re = /\r?\n|\r|\0/g;
		const lineStarts = [0];
		const lineEnds = [];
		let match;
		let foundLineNo = -1;
		while (match = re.exec(mark.buffer)) {
			lineEnds.push(match.index);
			lineStarts.push(match.index + match[0].length);
			if (mark.position <= match.index && foundLineNo < 0) foundLineNo = lineStarts.length - 2;
		}
		if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
		let result = "";
		const lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
		const maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
		for (let i = 1; i <= options.linesBefore; i++) {
			if (foundLineNo - i < 0) break;
			const line2 = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
			result = common2.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line2.str + "\n" + result;
		}
		const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
		result += common2.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
		result += common2.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
		for (let i = 1; i <= options.linesAfter; i++) {
			if (foundLineNo + i >= lineEnds.length) break;
			const line2 = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
			result += common2.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line2.str + "\n";
		}
		return result.replace(/\n$/, "");
	}
	snippet = makeSnippet;
	return snippet;
}
function requireType() {
	if (hasRequiredType) return type;
	hasRequiredType = 1;
	const YAMLException2 = requireException();
	const TYPE_CONSTRUCTOR_OPTIONS = [
		"kind",
		"multi",
		"resolve",
		"construct",
		"instanceOf",
		"predicate",
		"represent",
		"representName",
		"defaultStyle",
		"styleAliases"
	];
	const YAML_NODE_KINDS = [
		"scalar",
		"sequence",
		"mapping"
	];
	function compileStyleAliases(map2) {
		const result = {};
		if (map2 !== null) Object.keys(map2).forEach(function(style) {
			map2[style].forEach(function(alias) {
				result[String(alias)] = style;
			});
		});
		return result;
	}
	function Type2(tag, options) {
		options = options || {};
		Object.keys(options).forEach(function(name) {
			if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) throw new YAMLException2("Unknown option \"" + name + "\" is met in definition of \"" + tag + "\" YAML type.");
		});
		this.options = options;
		this.tag = tag;
		this.kind = options["kind"] || null;
		this.resolve = options["resolve"] || function() {
			return true;
		};
		this.construct = options["construct"] || function(data) {
			return data;
		};
		this.instanceOf = options["instanceOf"] || null;
		this.predicate = options["predicate"] || null;
		this.represent = options["represent"] || null;
		this.representName = options["representName"] || null;
		this.defaultStyle = options["defaultStyle"] || null;
		this.multi = options["multi"] || false;
		this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
		if (YAML_NODE_KINDS.indexOf(this.kind) === -1) throw new YAMLException2("Unknown kind \"" + this.kind + "\" is specified for \"" + tag + "\" YAML type.");
	}
	type = Type2;
	return type;
}
function requireSchema() {
	if (hasRequiredSchema) return schema;
	hasRequiredSchema = 1;
	const YAMLException2 = requireException();
	const Type2 = requireType();
	function compileList(schema2, name) {
		const result = [];
		schema2[name].forEach(function(currentType) {
			let newIndex = result.length;
			result.forEach(function(previousType, previousIndex) {
				if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) newIndex = previousIndex;
			});
			result[newIndex] = currentType;
		});
		return result;
	}
	function compileMap() {
		const result = {
			scalar: {},
			sequence: {},
			mapping: {},
			fallback: {},
			multi: {
				scalar: [],
				sequence: [],
				mapping: [],
				fallback: []
			}
		};
		function collectType(type2) {
			if (type2.multi) {
				result.multi[type2.kind].push(type2);
				result.multi["fallback"].push(type2);
			} else result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
		}
		for (let index = 0, length = arguments.length; index < length; index += 1) arguments[index].forEach(collectType);
		return result;
	}
	function Schema2(definition) {
		return this.extend(definition);
	}
	Schema2.prototype.extend = function extend(definition) {
		let implicit = [];
		let explicit = [];
		if (definition instanceof Type2) explicit.push(definition);
		else if (Array.isArray(definition)) explicit = explicit.concat(definition);
		else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
			if (definition.implicit) implicit = implicit.concat(definition.implicit);
			if (definition.explicit) explicit = explicit.concat(definition.explicit);
		} else throw new YAMLException2("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
		implicit.forEach(function(type2) {
			if (!(type2 instanceof Type2)) throw new YAMLException2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
			if (type2.loadKind && type2.loadKind !== "scalar") throw new YAMLException2("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
			if (type2.multi) throw new YAMLException2("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
		});
		explicit.forEach(function(type2) {
			if (!(type2 instanceof Type2)) throw new YAMLException2("Specified list of YAML types (or a single Type object) contains a non-Type object.");
		});
		const result = Object.create(Schema2.prototype);
		result.implicit = (this.implicit || []).concat(implicit);
		result.explicit = (this.explicit || []).concat(explicit);
		result.compiledImplicit = compileList(result, "implicit");
		result.compiledExplicit = compileList(result, "explicit");
		result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
		return result;
	};
	schema = Schema2;
	return schema;
}
function requireStr() {
	if (hasRequiredStr) return str;
	hasRequiredStr = 1;
	str = new (requireType())("tag:yaml.org,2002:str", {
		kind: "scalar",
		construct: function(data) {
			return data !== null ? data : "";
		}
	});
	return str;
}
function requireSeq() {
	if (hasRequiredSeq) return seq;
	hasRequiredSeq = 1;
	seq = new (requireType())("tag:yaml.org,2002:seq", {
		kind: "sequence",
		construct: function(data) {
			return data !== null ? data : [];
		}
	});
	return seq;
}
function requireMap() {
	if (hasRequiredMap) return map;
	hasRequiredMap = 1;
	map = new (requireType())("tag:yaml.org,2002:map", {
		kind: "mapping",
		construct: function(data) {
			return data !== null ? data : {};
		}
	});
	return map;
}
function requireFailsafe() {
	if (hasRequiredFailsafe) return failsafe;
	hasRequiredFailsafe = 1;
	failsafe = new (requireSchema())({ explicit: [
		requireStr(),
		requireSeq(),
		requireMap()
	] });
	return failsafe;
}
function require_null() {
	if (hasRequired_null) return _null;
	hasRequired_null = 1;
	const Type2 = requireType();
	function resolveYamlNull(data) {
		if (data === null) return true;
		const max = data.length;
		return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
	}
	function constructYamlNull() {
		return null;
	}
	function isNull(object) {
		return object === null;
	}
	_null = new Type2("tag:yaml.org,2002:null", {
		kind: "scalar",
		resolve: resolveYamlNull,
		construct: constructYamlNull,
		predicate: isNull,
		represent: {
			canonical: function() {
				return "~";
			},
			lowercase: function() {
				return "null";
			},
			uppercase: function() {
				return "NULL";
			},
			camelcase: function() {
				return "Null";
			},
			empty: function() {
				return "";
			}
		},
		defaultStyle: "lowercase"
	});
	return _null;
}
function requireBool() {
	if (hasRequiredBool) return bool;
	hasRequiredBool = 1;
	const Type2 = requireType();
	function resolveYamlBoolean(data) {
		if (data === null) return false;
		const max = data.length;
		return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
	}
	function constructYamlBoolean(data) {
		return data === "true" || data === "True" || data === "TRUE";
	}
	function isBoolean(object) {
		return Object.prototype.toString.call(object) === "[object Boolean]";
	}
	bool = new Type2("tag:yaml.org,2002:bool", {
		kind: "scalar",
		resolve: resolveYamlBoolean,
		construct: constructYamlBoolean,
		predicate: isBoolean,
		represent: {
			lowercase: function(object) {
				return object ? "true" : "false";
			},
			uppercase: function(object) {
				return object ? "TRUE" : "FALSE";
			},
			camelcase: function(object) {
				return object ? "True" : "False";
			}
		},
		defaultStyle: "lowercase"
	});
	return bool;
}
function requireInt() {
	if (hasRequiredInt) return int;
	hasRequiredInt = 1;
	const common2 = requireCommon();
	const Type2 = requireType();
	function isHexCode(c) {
		return c >= 48 && c <= 57 || c >= 65 && c <= 70 || c >= 97 && c <= 102;
	}
	function isOctCode(c) {
		return c >= 48 && c <= 55;
	}
	function isDecCode(c) {
		return c >= 48 && c <= 57;
	}
	function resolveYamlInteger(data) {
		if (data === null) return false;
		const max = data.length;
		let index = 0;
		let hasDigits = false;
		if (!max) return false;
		let ch = data[index];
		if (ch === "-" || ch === "+") ch = data[++index];
		if (ch === "0") {
			if (index + 1 === max) return true;
			ch = data[++index];
			if (ch === "b") {
				index++;
				for (; index < max; index++) {
					ch = data[index];
					if (ch !== "0" && ch !== "1") return false;
					hasDigits = true;
				}
				return hasDigits && isFinite(parseYamlInteger(data));
			}
			if (ch === "x") {
				index++;
				for (; index < max; index++) {
					if (!isHexCode(data.charCodeAt(index))) return false;
					hasDigits = true;
				}
				return hasDigits && isFinite(parseYamlInteger(data));
			}
			if (ch === "o") {
				index++;
				for (; index < max; index++) {
					if (!isOctCode(data.charCodeAt(index))) return false;
					hasDigits = true;
				}
				return hasDigits && isFinite(parseYamlInteger(data));
			}
		}
		for (; index < max; index++) {
			if (!isDecCode(data.charCodeAt(index))) return false;
			hasDigits = true;
		}
		if (!hasDigits) return false;
		return isFinite(parseYamlInteger(data));
	}
	function parseYamlInteger(data) {
		let value = data;
		let sign = 1;
		let ch = value[0];
		if (ch === "-" || ch === "+") {
			if (ch === "-") sign = -1;
			value = value.slice(1);
			ch = value[0];
		}
		if (value === "0") return 0;
		if (ch === "0") {
			if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
			if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
			if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
		}
		return sign * parseInt(value, 10);
	}
	function constructYamlInteger(data) {
		return parseYamlInteger(data);
	}
	function isInteger(object) {
		return Object.prototype.toString.call(object) === "[object Number]" && object % 1 === 0 && !common2.isNegativeZero(object);
	}
	int = new Type2("tag:yaml.org,2002:int", {
		kind: "scalar",
		resolve: resolveYamlInteger,
		construct: constructYamlInteger,
		predicate: isInteger,
		represent: {
			binary: function(obj) {
				return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
			},
			octal: function(obj) {
				return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
			},
			decimal: function(obj) {
				return obj.toString(10);
			},
			hexadecimal: function(obj) {
				return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
			}
		},
		defaultStyle: "decimal",
		styleAliases: {
			binary: [2, "bin"],
			octal: [8, "oct"],
			decimal: [10, "dec"],
			hexadecimal: [16, "hex"]
		}
	});
	return int;
}
function requireFloat() {
	if (hasRequiredFloat) return float;
	hasRequiredFloat = 1;
	const common2 = requireCommon();
	const Type2 = requireType();
	const YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:[0-9]+)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
	const YAML_FLOAT_SPECIAL_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
	function resolveYamlFloat(data) {
		if (data === null) return false;
		if (!YAML_FLOAT_PATTERN.test(data)) return false;
		if (isFinite(parseFloat(data, 10))) return true;
		return YAML_FLOAT_SPECIAL_PATTERN.test(data);
	}
	function constructYamlFloat(data) {
		let value = data.toLowerCase();
		const sign = value[0] === "-" ? -1 : 1;
		if ("+-".indexOf(value[0]) >= 0) value = value.slice(1);
		if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
		else if (value === ".nan") return NaN;
		return sign * parseFloat(value, 10);
	}
	const SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
	function representYamlFloat(object, style) {
		if (isNaN(object)) switch (style) {
			case "lowercase": return ".nan";
			case "uppercase": return ".NAN";
			case "camelcase": return ".NaN";
		}
		else if (Number.POSITIVE_INFINITY === object) switch (style) {
			case "lowercase": return ".inf";
			case "uppercase": return ".INF";
			case "camelcase": return ".Inf";
		}
		else if (Number.NEGATIVE_INFINITY === object) switch (style) {
			case "lowercase": return "-.inf";
			case "uppercase": return "-.INF";
			case "camelcase": return "-.Inf";
		}
		else if (common2.isNegativeZero(object)) return "-0.0";
		const res = object.toString(10);
		return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
	}
	function isFloat(object) {
		return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common2.isNegativeZero(object));
	}
	float = new Type2("tag:yaml.org,2002:float", {
		kind: "scalar",
		resolve: resolveYamlFloat,
		construct: constructYamlFloat,
		predicate: isFloat,
		represent: representYamlFloat,
		defaultStyle: "lowercase"
	});
	return float;
}
function requireJson() {
	if (hasRequiredJson) return json;
	hasRequiredJson = 1;
	json = requireFailsafe().extend({ implicit: [
		require_null(),
		requireBool(),
		requireInt(),
		requireFloat()
	] });
	return json;
}
function requireCore() {
	if (hasRequiredCore) return core;
	hasRequiredCore = 1;
	core = requireJson();
	return core;
}
function requireTimestamp() {
	if (hasRequiredTimestamp) return timestamp;
	hasRequiredTimestamp = 1;
	const Type2 = requireType();
	const YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
	const YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
	function resolveYamlTimestamp(data) {
		if (data === null) return false;
		if (YAML_DATE_REGEXP.exec(data) !== null) return true;
		if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
		return false;
	}
	function constructYamlTimestamp(data) {
		let fraction = 0;
		let delta = null;
		let match = YAML_DATE_REGEXP.exec(data);
		if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
		if (match === null) throw new Error("Date resolve error");
		const year = +match[1];
		const month = +match[2] - 1;
		const day = +match[3];
		if (!match[4]) return new Date(Date.UTC(year, month, day));
		const hour = +match[4];
		const minute = +match[5];
		const second = +match[6];
		if (match[7]) {
			fraction = match[7].slice(0, 3);
			while (fraction.length < 3) fraction += "0";
			fraction = +fraction;
		}
		if (match[9]) {
			const tzHour = +match[10];
			const tzMinute = +(match[11] || 0);
			delta = (tzHour * 60 + tzMinute) * 6e4;
			if (match[9] === "-") delta = -delta;
		}
		const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
		if (delta) date.setTime(date.getTime() - delta);
		return date;
	}
	function representYamlTimestamp(object) {
		return object.toISOString();
	}
	timestamp = new Type2("tag:yaml.org,2002:timestamp", {
		kind: "scalar",
		resolve: resolveYamlTimestamp,
		construct: constructYamlTimestamp,
		instanceOf: Date,
		represent: representYamlTimestamp
	});
	return timestamp;
}
function requireMerge() {
	if (hasRequiredMerge) return merge;
	hasRequiredMerge = 1;
	const Type2 = requireType();
	function resolveYamlMerge(data) {
		return data === "<<" || data === null;
	}
	merge = new Type2("tag:yaml.org,2002:merge", {
		kind: "scalar",
		resolve: resolveYamlMerge
	});
	return merge;
}
function requireBinary() {
	if (hasRequiredBinary) return binary;
	hasRequiredBinary = 1;
	const Type2 = requireType();
	const BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
	function resolveYamlBinary(data) {
		if (data === null) return false;
		let bitlen = 0;
		const max = data.length;
		const map2 = BASE64_MAP;
		for (let idx = 0; idx < max; idx++) {
			const code = map2.indexOf(data.charAt(idx));
			if (code > 64) continue;
			if (code < 0) return false;
			bitlen += 6;
		}
		return bitlen % 8 === 0;
	}
	function constructYamlBinary(data) {
		const input = data.replace(/[\r\n=]/g, "");
		const max = input.length;
		const map2 = BASE64_MAP;
		let bits = 0;
		const result = [];
		for (let idx = 0; idx < max; idx++) {
			if (idx % 4 === 0 && idx) {
				result.push(bits >> 16 & 255);
				result.push(bits >> 8 & 255);
				result.push(bits & 255);
			}
			bits = bits << 6 | map2.indexOf(input.charAt(idx));
		}
		const tailbits = max % 4 * 6;
		if (tailbits === 0) {
			result.push(bits >> 16 & 255);
			result.push(bits >> 8 & 255);
			result.push(bits & 255);
		} else if (tailbits === 18) {
			result.push(bits >> 10 & 255);
			result.push(bits >> 2 & 255);
		} else if (tailbits === 12) result.push(bits >> 4 & 255);
		return new Uint8Array(result);
	}
	function representYamlBinary(object) {
		let result = "";
		let bits = 0;
		const max = object.length;
		const map2 = BASE64_MAP;
		for (let idx = 0; idx < max; idx++) {
			if (idx % 3 === 0 && idx) {
				result += map2[bits >> 18 & 63];
				result += map2[bits >> 12 & 63];
				result += map2[bits >> 6 & 63];
				result += map2[bits & 63];
			}
			bits = (bits << 8) + object[idx];
		}
		const tail = max % 3;
		if (tail === 0) {
			result += map2[bits >> 18 & 63];
			result += map2[bits >> 12 & 63];
			result += map2[bits >> 6 & 63];
			result += map2[bits & 63];
		} else if (tail === 2) {
			result += map2[bits >> 10 & 63];
			result += map2[bits >> 4 & 63];
			result += map2[bits << 2 & 63];
			result += map2[64];
		} else if (tail === 1) {
			result += map2[bits >> 2 & 63];
			result += map2[bits << 4 & 63];
			result += map2[64];
			result += map2[64];
		}
		return result;
	}
	function isBinary(obj) {
		return Object.prototype.toString.call(obj) === "[object Uint8Array]";
	}
	binary = new Type2("tag:yaml.org,2002:binary", {
		kind: "scalar",
		resolve: resolveYamlBinary,
		construct: constructYamlBinary,
		predicate: isBinary,
		represent: representYamlBinary
	});
	return binary;
}
function requireOmap() {
	if (hasRequiredOmap) return omap;
	hasRequiredOmap = 1;
	const Type2 = requireType();
	const _hasOwnProperty = Object.prototype.hasOwnProperty;
	const _toString = Object.prototype.toString;
	function resolveYamlOmap(data) {
		if (data === null) return true;
		const objectKeys = {};
		const object = data;
		for (let index = 0, length = object.length; index < length; index += 1) {
			const pair = object[index];
			let pairHasKey = false;
			if (_toString.call(pair) !== "[object Object]") return false;
			let pairKey;
			for (pairKey in pair) if (_hasOwnProperty.call(pair, pairKey)) if (!pairHasKey) pairHasKey = true;
			else return false;
			if (!pairHasKey) return false;
			if (_hasOwnProperty.call(objectKeys, pairKey)) return false;
			Object.defineProperty(objectKeys, pairKey, { value: true });
		}
		return true;
	}
	function constructYamlOmap(data) {
		return data !== null ? data : [];
	}
	omap = new Type2("tag:yaml.org,2002:omap", {
		kind: "sequence",
		resolve: resolveYamlOmap,
		construct: constructYamlOmap
	});
	return omap;
}
function requirePairs() {
	if (hasRequiredPairs) return pairs;
	hasRequiredPairs = 1;
	const Type2 = requireType();
	const _toString = Object.prototype.toString;
	function resolveYamlPairs(data) {
		if (data === null) return true;
		const object = data;
		const result = new Array(object.length);
		for (let index = 0, length = object.length; index < length; index += 1) {
			const pair = object[index];
			if (_toString.call(pair) !== "[object Object]") return false;
			const keys = Object.keys(pair);
			if (keys.length !== 1) return false;
			result[index] = [keys[0], pair[keys[0]]];
		}
		return true;
	}
	function constructYamlPairs(data) {
		if (data === null) return [];
		const object = data;
		const result = new Array(object.length);
		for (let index = 0, length = object.length; index < length; index += 1) {
			const pair = object[index];
			const keys = Object.keys(pair);
			result[index] = [keys[0], pair[keys[0]]];
		}
		return result;
	}
	pairs = new Type2("tag:yaml.org,2002:pairs", {
		kind: "sequence",
		resolve: resolveYamlPairs,
		construct: constructYamlPairs
	});
	return pairs;
}
function requireSet() {
	if (hasRequiredSet) return set;
	hasRequiredSet = 1;
	const Type2 = requireType();
	const _hasOwnProperty = Object.prototype.hasOwnProperty;
	function resolveYamlSet(data) {
		if (data === null) return true;
		const object = data;
		for (const key in object) if (_hasOwnProperty.call(object, key)) {
			if (object[key] !== null) return false;
		}
		return true;
	}
	function constructYamlSet(data) {
		return data !== null ? data : {};
	}
	set = new Type2("tag:yaml.org,2002:set", {
		kind: "mapping",
		resolve: resolveYamlSet,
		construct: constructYamlSet
	});
	return set;
}
function require_default() {
	if (hasRequired_default) return _default;
	hasRequired_default = 1;
	_default = requireCore().extend({
		implicit: [requireTimestamp(), requireMerge()],
		explicit: [
			requireBinary(),
			requireOmap(),
			requirePairs(),
			requireSet()
		]
	});
	return _default;
}
function requireLoader() {
	if (hasRequiredLoader) return loader;
	hasRequiredLoader = 1;
	const common2 = requireCommon();
	const YAMLException2 = requireException();
	const makeSnippet = requireSnippet();
	const DEFAULT_SCHEMA2 = require_default();
	const _hasOwnProperty = Object.prototype.hasOwnProperty;
	const CONTEXT_FLOW_IN = 1;
	const CONTEXT_FLOW_OUT = 2;
	const CONTEXT_BLOCK_IN = 3;
	const CONTEXT_BLOCK_OUT = 4;
	const CHOMPING_CLIP = 1;
	const CHOMPING_STRIP = 2;
	const CHOMPING_KEEP = 3;
	const PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
	const PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
	const PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
	const PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
	const PATTERN_TAG_URI = /^(?:!|[^,\[\]{}])(?:%[0-9a-f]{2}|[0-9a-z\-#;/?:@&=+$,_.!~*'()\[\]])*$/i;
	function _class(obj) {
		return Object.prototype.toString.call(obj);
	}
	function isEol(c) {
		return c === 10 || c === 13;
	}
	function isWhiteSpace(c) {
		return c === 9 || c === 32;
	}
	function isWsOrEol(c) {
		return c === 9 || c === 32 || c === 10 || c === 13;
	}
	function isFlowIndicator(c) {
		return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
	}
	function fromHexCode(c) {
		if (c >= 48 && c <= 57) return c - 48;
		const lc = c | 32;
		if (lc >= 97 && lc <= 102) return lc - 97 + 10;
		return -1;
	}
	function escapedHexLen(c) {
		if (c === 120) return 2;
		if (c === 117) return 4;
		if (c === 85) return 8;
		return 0;
	}
	function fromDecimalCode(c) {
		if (c >= 48 && c <= 57) return c - 48;
		return -1;
	}
	function simpleEscapeSequence(c) {
		switch (c) {
			case 48: return "\0";
			case 97: return "\x07";
			case 98: return "\b";
			case 116: return "	";
			case 9: return "	";
			case 110: return "\n";
			case 118: return "\v";
			case 102: return "\f";
			case 114: return "\r";
			case 101: return "\x1B";
			case 32: return " ";
			case 34: return "\"";
			case 47: return "/";
			case 92: return "\\";
			case 78: return "";
			case 95: return "\xA0";
			case 76: return "\u2028";
			case 80: return "\u2029";
			default: return "";
		}
	}
	function charFromCodepoint(c) {
		if (c <= 65535) return String.fromCharCode(c);
		return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
	}
	function setProperty(object, key, value) {
		if (key === "__proto__") Object.defineProperty(object, key, {
			configurable: true,
			enumerable: true,
			writable: true,
			value
		});
		else object[key] = value;
	}
	const simpleEscapeCheck = new Array(256);
	const simpleEscapeMap = new Array(256);
	for (let i = 0; i < 256; i++) {
		simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
		simpleEscapeMap[i] = simpleEscapeSequence(i);
	}
	function State(input, options) {
		this.input = input;
		this.filename = options["filename"] || null;
		this.schema = options["schema"] || DEFAULT_SCHEMA2;
		this.onWarning = options["onWarning"] || null;
		this.legacy = options["legacy"] || false;
		this.json = options["json"] || false;
		this.listener = options["listener"] || null;
		this.maxDepth = typeof options["maxDepth"] === "number" ? options["maxDepth"] : 100;
		this.maxTotalMergeKeys = typeof options["maxTotalMergeKeys"] === "number" ? options["maxTotalMergeKeys"] : 1e4;
		this.implicitTypes = this.schema.compiledImplicit;
		this.typeMap = this.schema.compiledTypeMap;
		this.length = input.length;
		this.position = 0;
		this.line = 0;
		this.lineStart = 0;
		this.lineIndent = 0;
		this.depth = 0;
		this.totalMergeKeys = 0;
		this.firstTabInLine = -1;
		this.documents = [];
		this.anchorMapTransactions = [];
	}
	function generateError(state, message) {
		const mark = {
			name: state.filename,
			buffer: state.input.slice(0, -1),
			position: state.position,
			line: state.line,
			column: state.position - state.lineStart
		};
		mark.snippet = makeSnippet(mark);
		return new YAMLException2(message, mark);
	}
	function throwError(state, message) {
		throw generateError(state, message);
	}
	function throwWarning(state, message) {
		if (state.onWarning) state.onWarning.call(null, generateError(state, message));
	}
	function storeAnchor(state, name, value) {
		const transactions = state.anchorMapTransactions;
		if (transactions.length !== 0) {
			const transaction = transactions[transactions.length - 1];
			if (!_hasOwnProperty.call(transaction, name)) transaction[name] = {
				existed: _hasOwnProperty.call(state.anchorMap, name),
				value: state.anchorMap[name]
			};
		}
		state.anchorMap[name] = value;
	}
	function beginAnchorTransaction(state) {
		state.anchorMapTransactions.push(/* @__PURE__ */ Object.create(null));
	}
	function commitAnchorTransaction(state) {
		const transaction = state.anchorMapTransactions.pop();
		const transactions = state.anchorMapTransactions;
		if (transactions.length === 0) return;
		const parent = transactions[transactions.length - 1];
		const names = Object.keys(transaction);
		for (let index = 0, length = names.length; index < length; index += 1) {
			const name = names[index];
			if (!_hasOwnProperty.call(parent, name)) parent[name] = transaction[name];
		}
	}
	function rollbackAnchorTransaction(state) {
		const transaction = state.anchorMapTransactions.pop();
		const names = Object.keys(transaction);
		for (let index = names.length - 1; index >= 0; index -= 1) {
			const entry = transaction[names[index]];
			if (entry.existed) state.anchorMap[names[index]] = entry.value;
			else delete state.anchorMap[names[index]];
		}
	}
	function snapshotState(state) {
		return {
			position: state.position,
			line: state.line,
			lineStart: state.lineStart,
			lineIndent: state.lineIndent,
			firstTabInLine: state.firstTabInLine,
			tag: state.tag,
			anchor: state.anchor,
			kind: state.kind,
			result: state.result
		};
	}
	function restoreState(state, snapshot) {
		state.position = snapshot.position;
		state.line = snapshot.line;
		state.lineStart = snapshot.lineStart;
		state.lineIndent = snapshot.lineIndent;
		state.firstTabInLine = snapshot.firstTabInLine;
		state.tag = snapshot.tag;
		state.anchor = snapshot.anchor;
		state.kind = snapshot.kind;
		state.result = snapshot.result;
	}
	const directiveHandlers = {
		YAML: function handleYamlDirective(state, name, args) {
			if (state.version !== null) throwError(state, "duplication of %YAML directive");
			if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
			const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
			if (match === null) throwError(state, "ill-formed argument of the YAML directive");
			const major = parseInt(match[1], 10);
			const minor = parseInt(match[2], 10);
			if (major !== 1) throwError(state, "unacceptable YAML version of the document");
			state.version = args[0];
			state.checkLineBreaks = minor < 2;
			if (minor !== 1 && minor !== 2) throwWarning(state, "unsupported YAML version of the document");
		},
		TAG: function handleTagDirective(state, name, args) {
			let prefix;
			if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
			const handle = args[0];
			prefix = args[1];
			if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
			if (_hasOwnProperty.call(state.tagMap, handle)) throwError(state, "there is a previously declared suffix for \"" + handle + "\" tag handle");
			if (!PATTERN_TAG_URI.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
			try {
				prefix = decodeURIComponent(prefix);
			} catch (err) {
				throwError(state, "tag prefix is malformed: " + prefix);
			}
			state.tagMap[handle] = prefix;
		}
	};
	function captureSegment(state, start, end, checkJson) {
		if (start < end) {
			const _result = state.input.slice(start, end);
			if (checkJson) for (let _position = 0, _length = _result.length; _position < _length; _position += 1) {
				const _character = _result.charCodeAt(_position);
				if (!(_character === 9 || _character >= 32 && _character <= 1114111)) throwError(state, "expected valid JSON character");
			}
			else if (PATTERN_NON_PRINTABLE.test(_result)) throwError(state, "the stream contains non-printable characters");
			state.result += _result;
		}
	}
	function chargeMergeWork(state) {
		state.totalMergeKeys++;
		if (state.maxTotalMergeKeys !== -1 && state.totalMergeKeys > state.maxTotalMergeKeys) throwError(state, "merge keys exceeded maxTotalMergeKeys (" + state.maxTotalMergeKeys + ")");
	}
	function mergeMappings(state, destination, source, overridableKeys) {
		if (!common2.isObject(source)) throwError(state, "cannot merge mappings; the provided source object is unacceptable");
		chargeMergeWork(state);
		const sourceKeys = Object.keys(source);
		for (let index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
			const key = sourceKeys[index];
			chargeMergeWork(state);
			if (!_hasOwnProperty.call(destination, key)) {
				setProperty(destination, key, source[key]);
				overridableKeys[key] = true;
			}
		}
	}
	function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
		if (Array.isArray(keyNode)) {
			keyNode = Array.prototype.slice.call(keyNode);
			for (let index = 0, quantity = keyNode.length; index < quantity; index += 1) {
				if (Array.isArray(keyNode[index])) throwError(state, "nested arrays are not supported inside keys");
				if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") keyNode[index] = "[object Object]";
			}
		}
		if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") keyNode = "[object Object]";
		keyNode = String(keyNode);
		if (_result === null) _result = {};
		if (keyTag === "tag:yaml.org,2002:merge") if (Array.isArray(valueNode)) {
			if (valueNode.length > 100) throwError(state, "abnormal merge sequence size");
			for (let index = 0, quantity = valueNode.length; index < quantity; index += 1) mergeMappings(state, _result, valueNode[index], overridableKeys);
		} else mergeMappings(state, _result, valueNode, overridableKeys);
		else {
			if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
				state.line = startLine || state.line;
				state.lineStart = startLineStart || state.lineStart;
				state.position = startPos || state.position;
				throwError(state, "duplicated mapping key");
			}
			setProperty(_result, keyNode, valueNode);
			delete overridableKeys[keyNode];
		}
		return _result;
	}
	function readLineBreak(state) {
		const ch = state.input.charCodeAt(state.position);
		if (ch === 10) state.position++;
		else if (ch === 13) {
			state.position++;
			if (state.input.charCodeAt(state.position) === 10) state.position++;
		} else throwError(state, "a line break is expected");
		state.line += 1;
		state.lineStart = state.position;
		state.firstTabInLine = -1;
	}
	function skipSeparationSpace(state, allowComments, checkIndent) {
		let lineBreaks = 0;
		let ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			while (isWhiteSpace(ch)) {
				if (ch === 9 && state.firstTabInLine === -1) state.firstTabInLine = state.position;
				ch = state.input.charCodeAt(++state.position);
			}
			if (allowComments && ch === 35) do
				ch = state.input.charCodeAt(++state.position);
			while (ch !== 10 && ch !== 13 && ch !== 0);
			if (isEol(ch)) {
				readLineBreak(state);
				ch = state.input.charCodeAt(state.position);
				lineBreaks++;
				state.lineIndent = 0;
				while (ch === 32) {
					state.lineIndent++;
					ch = state.input.charCodeAt(++state.position);
				}
			} else break;
		}
		if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) throwWarning(state, "deficient indentation");
		return lineBreaks;
	}
	function testDocumentSeparator(state) {
		let _position = state.position;
		let ch = state.input.charCodeAt(_position);
		if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
			_position += 3;
			ch = state.input.charCodeAt(_position);
			if (ch === 0 || isWsOrEol(ch)) return true;
		}
		return false;
	}
	function writeFoldedLines(state, count) {
		if (count === 1) state.result += " ";
		else if (count > 1) state.result += common2.repeat("\n", count - 1);
	}
	function readPlainScalar(state, nodeIndent, withinFlowCollection) {
		let captureStart;
		let captureEnd;
		let hasPendingContent;
		let _line;
		let _lineStart;
		let _lineIndent;
		const _kind = state.kind;
		const _result = state.result;
		let ch = state.input.charCodeAt(state.position);
		if (isWsOrEol(ch) || isFlowIndicator(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) return false;
		if (ch === 63 || ch === 45) {
			const following = state.input.charCodeAt(state.position + 1);
			if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) return false;
		}
		state.kind = "scalar";
		state.result = "";
		captureStart = captureEnd = state.position;
		hasPendingContent = false;
		while (ch !== 0) {
			if (ch === 58) {
				const following = state.input.charCodeAt(state.position + 1);
				if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) break;
			} else if (ch === 35) {
				if (isWsOrEol(state.input.charCodeAt(state.position - 1))) break;
			} else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && isFlowIndicator(ch)) break;
			else if (isEol(ch)) {
				_line = state.line;
				_lineStart = state.lineStart;
				_lineIndent = state.lineIndent;
				skipSeparationSpace(state, false, -1);
				if (state.lineIndent >= nodeIndent) {
					hasPendingContent = true;
					ch = state.input.charCodeAt(state.position);
					continue;
				} else {
					state.position = captureEnd;
					state.line = _line;
					state.lineStart = _lineStart;
					state.lineIndent = _lineIndent;
					break;
				}
			}
			if (hasPendingContent) {
				captureSegment(state, captureStart, captureEnd, false);
				writeFoldedLines(state, state.line - _line);
				captureStart = captureEnd = state.position;
				hasPendingContent = false;
			}
			if (!isWhiteSpace(ch)) captureEnd = state.position + 1;
			ch = state.input.charCodeAt(++state.position);
		}
		captureSegment(state, captureStart, captureEnd, false);
		if (state.result) return true;
		state.kind = _kind;
		state.result = _result;
		return false;
	}
	function readSingleQuotedScalar(state, nodeIndent) {
		let captureStart;
		let captureEnd;
		let ch = state.input.charCodeAt(state.position);
		if (ch !== 39) return false;
		state.kind = "scalar";
		state.result = "";
		state.position++;
		captureStart = captureEnd = state.position;
		while ((ch = state.input.charCodeAt(state.position)) !== 0) if (ch === 39) {
			captureSegment(state, captureStart, state.position, true);
			ch = state.input.charCodeAt(++state.position);
			if (ch === 39) {
				captureStart = state.position;
				state.position++;
				captureEnd = state.position;
			} else return true;
		} else if (isEol(ch)) {
			captureSegment(state, captureStart, captureEnd, true);
			writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
			captureStart = captureEnd = state.position;
		} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
		else {
			state.position++;
			if (!isWhiteSpace(ch)) captureEnd = state.position;
		}
		throwError(state, "unexpected end of the stream within a single quoted scalar");
	}
	function readDoubleQuotedScalar(state, nodeIndent) {
		let captureStart;
		let captureEnd;
		let tmp;
		let ch = state.input.charCodeAt(state.position);
		if (ch !== 34) return false;
		state.kind = "scalar";
		state.result = "";
		state.position++;
		captureStart = captureEnd = state.position;
		while ((ch = state.input.charCodeAt(state.position)) !== 0) if (ch === 34) {
			captureSegment(state, captureStart, state.position, true);
			state.position++;
			return true;
		} else if (ch === 92) {
			captureSegment(state, captureStart, state.position, true);
			ch = state.input.charCodeAt(++state.position);
			if (isEol(ch)) skipSeparationSpace(state, false, nodeIndent);
			else if (ch < 256 && simpleEscapeCheck[ch]) {
				state.result += simpleEscapeMap[ch];
				state.position++;
			} else if ((tmp = escapedHexLen(ch)) > 0) {
				let hexLength = tmp;
				let hexResult = 0;
				for (; hexLength > 0; hexLength--) {
					ch = state.input.charCodeAt(++state.position);
					if ((tmp = fromHexCode(ch)) >= 0) hexResult = (hexResult << 4) + tmp;
					else throwError(state, "expected hexadecimal character");
				}
				state.result += charFromCodepoint(hexResult);
				state.position++;
			} else throwError(state, "unknown escape sequence");
			captureStart = captureEnd = state.position;
		} else if (isEol(ch)) {
			captureSegment(state, captureStart, captureEnd, true);
			writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
			captureStart = captureEnd = state.position;
		} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
		else {
			state.position++;
			if (!isWhiteSpace(ch)) captureEnd = state.position;
		}
		throwError(state, "unexpected end of the stream within a double quoted scalar");
	}
	function readFlowCollection(state, nodeIndent) {
		let readNext = true;
		let _line;
		let _lineStart;
		let _pos;
		const _tag = state.tag;
		let _result;
		const _anchor = state.anchor;
		let terminator;
		let isPair;
		let isExplicitPair;
		let isMapping;
		const overridableKeys = /* @__PURE__ */ Object.create(null);
		let keyNode;
		let keyTag;
		let valueNode;
		let ch = state.input.charCodeAt(state.position);
		if (ch === 91) {
			terminator = 93;
			isMapping = false;
			_result = [];
		} else if (ch === 123) {
			terminator = 125;
			isMapping = true;
			_result = {};
		} else return false;
		if (state.anchor !== null) storeAnchor(state, state.anchor, _result);
		ch = state.input.charCodeAt(++state.position);
		while (ch !== 0) {
			skipSeparationSpace(state, true, nodeIndent);
			ch = state.input.charCodeAt(state.position);
			if (ch === terminator) {
				state.position++;
				state.tag = _tag;
				state.anchor = _anchor;
				state.kind = isMapping ? "mapping" : "sequence";
				state.result = _result;
				return true;
			} else if (!readNext) throwError(state, "missed comma between flow collection entries");
			else if (ch === 44) throwError(state, "expected the node content, but found ','");
			keyTag = keyNode = valueNode = null;
			isPair = isExplicitPair = false;
			if (ch === 63) {
				if (isWsOrEol(state.input.charCodeAt(state.position + 1))) {
					isPair = isExplicitPair = true;
					state.position++;
					skipSeparationSpace(state, true, nodeIndent);
				}
			}
			_line = state.line;
			_lineStart = state.lineStart;
			_pos = state.position;
			composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
			keyTag = state.tag;
			keyNode = state.result;
			skipSeparationSpace(state, true, nodeIndent);
			ch = state.input.charCodeAt(state.position);
			if ((isExplicitPair || state.line === _line) && ch === 58) {
				isPair = true;
				ch = state.input.charCodeAt(++state.position);
				skipSeparationSpace(state, true, nodeIndent);
				composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
				valueNode = state.result;
			}
			if (isMapping) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
			else if (isPair) _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
			else _result.push(keyNode);
			skipSeparationSpace(state, true, nodeIndent);
			ch = state.input.charCodeAt(state.position);
			if (ch === 44) {
				readNext = true;
				ch = state.input.charCodeAt(++state.position);
			} else readNext = false;
		}
		throwError(state, "unexpected end of the stream within a flow collection");
	}
	function readBlockScalar(state, nodeIndent) {
		let folding;
		let chomping = CHOMPING_CLIP;
		let didReadContent = false;
		let detectedIndent = false;
		let textIndent = nodeIndent;
		let emptyLines = 0;
		let atMoreIndented = false;
		let tmp;
		let ch = state.input.charCodeAt(state.position);
		if (ch === 124) folding = false;
		else if (ch === 62) folding = true;
		else return false;
		state.kind = "scalar";
		state.result = "";
		while (ch !== 0) {
			ch = state.input.charCodeAt(++state.position);
			if (ch === 43 || ch === 45) if (CHOMPING_CLIP === chomping) chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
			else throwError(state, "repeat of a chomping mode identifier");
			else if ((tmp = fromDecimalCode(ch)) >= 0) if (tmp === 0) throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
			else if (!detectedIndent) {
				textIndent = nodeIndent + tmp - 1;
				detectedIndent = true;
			} else throwError(state, "repeat of an indentation width identifier");
			else break;
		}
		if (isWhiteSpace(ch)) {
			do
				ch = state.input.charCodeAt(++state.position);
			while (isWhiteSpace(ch));
			if (ch === 35) do
				ch = state.input.charCodeAt(++state.position);
			while (!isEol(ch) && ch !== 0);
		}
		while (ch !== 0) {
			readLineBreak(state);
			state.lineIndent = 0;
			ch = state.input.charCodeAt(state.position);
			while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
				state.lineIndent++;
				ch = state.input.charCodeAt(++state.position);
			}
			if (!detectedIndent && state.lineIndent > textIndent) textIndent = state.lineIndent;
			if (isEol(ch)) {
				emptyLines++;
				continue;
			}
			if (!detectedIndent && textIndent === 0) throwError(state, "missing indentation for block scalar");
			if (state.lineIndent < textIndent) {
				if (chomping === CHOMPING_KEEP) state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
				else if (chomping === CHOMPING_CLIP) {
					if (didReadContent) state.result += "\n";
				}
				break;
			}
			if (folding) if (isWhiteSpace(ch)) {
				atMoreIndented = true;
				state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
			} else if (atMoreIndented) {
				atMoreIndented = false;
				state.result += common2.repeat("\n", emptyLines + 1);
			} else if (emptyLines === 0) {
				if (didReadContent) state.result += " ";
			} else state.result += common2.repeat("\n", emptyLines);
			else state.result += common2.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
			didReadContent = true;
			detectedIndent = true;
			emptyLines = 0;
			const captureStart = state.position;
			while (!isEol(ch) && ch !== 0) ch = state.input.charCodeAt(++state.position);
			captureSegment(state, captureStart, state.position, false);
		}
		return true;
	}
	function readBlockSequence(state, nodeIndent) {
		const _tag = state.tag;
		const _anchor = state.anchor;
		const _result = [];
		let detected = false;
		if (state.firstTabInLine !== -1) return false;
		if (state.anchor !== null) storeAnchor(state, state.anchor, _result);
		let ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			if (state.firstTabInLine !== -1) {
				state.position = state.firstTabInLine;
				throwError(state, "tab characters must not be used in indentation");
			}
			if (ch !== 45) break;
			if (!isWsOrEol(state.input.charCodeAt(state.position + 1))) break;
			detected = true;
			state.position++;
			if (skipSeparationSpace(state, true, -1)) {
				if (state.lineIndent <= nodeIndent) {
					_result.push(null);
					ch = state.input.charCodeAt(state.position);
					continue;
				}
			}
			const _line = state.line;
			composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
			_result.push(state.result);
			skipSeparationSpace(state, true, -1);
			ch = state.input.charCodeAt(state.position);
			if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a sequence entry");
			else if (state.lineIndent < nodeIndent) break;
		}
		if (detected) {
			state.tag = _tag;
			state.anchor = _anchor;
			state.kind = "sequence";
			state.result = _result;
			return true;
		}
		return false;
	}
	function readBlockMapping(state, nodeIndent, flowIndent) {
		let allowCompact;
		let _keyLine;
		let _keyLineStart;
		let _keyPos;
		const _tag = state.tag;
		const _anchor = state.anchor;
		const _result = {};
		const overridableKeys = /* @__PURE__ */ Object.create(null);
		let keyTag = null;
		let keyNode = null;
		let valueNode = null;
		let atExplicitKey = false;
		let detected = false;
		if (state.firstTabInLine !== -1) return false;
		if (state.anchor !== null) storeAnchor(state, state.anchor, _result);
		let ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			if (!atExplicitKey && state.firstTabInLine !== -1) {
				state.position = state.firstTabInLine;
				throwError(state, "tab characters must not be used in indentation");
			}
			const following = state.input.charCodeAt(state.position + 1);
			const _line = state.line;
			if ((ch === 63 || ch === 58) && isWsOrEol(following)) {
				if (ch === 63) {
					if (atExplicitKey) {
						storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
						keyTag = keyNode = valueNode = null;
					}
					detected = true;
					atExplicitKey = true;
					allowCompact = true;
				} else if (atExplicitKey) {
					atExplicitKey = false;
					allowCompact = true;
				} else throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
				state.position += 1;
				ch = following;
			} else {
				_keyLine = state.line;
				_keyLineStart = state.lineStart;
				_keyPos = state.position;
				if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) break;
				if (state.line === _line) {
					ch = state.input.charCodeAt(state.position);
					while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
					if (ch === 58) {
						ch = state.input.charCodeAt(++state.position);
						if (!isWsOrEol(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
						if (atExplicitKey) {
							storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
							keyTag = keyNode = valueNode = null;
						}
						detected = true;
						atExplicitKey = false;
						allowCompact = false;
						keyTag = state.tag;
						keyNode = state.result;
					} else if (detected) throwError(state, "can not read an implicit mapping pair; a colon is missed");
					else {
						state.tag = _tag;
						state.anchor = _anchor;
						return true;
					}
				} else if (detected) throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
				else {
					state.tag = _tag;
					state.anchor = _anchor;
					return true;
				}
			}
			if (state.line === _line || state.lineIndent > nodeIndent) {
				if (atExplicitKey) {
					_keyLine = state.line;
					_keyLineStart = state.lineStart;
					_keyPos = state.position;
				}
				if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) if (atExplicitKey) keyNode = state.result;
				else valueNode = state.result;
				if (!atExplicitKey) {
					storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
					keyTag = keyNode = valueNode = null;
				}
				skipSeparationSpace(state, true, -1);
				ch = state.input.charCodeAt(state.position);
			}
			if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a mapping entry");
			else if (state.lineIndent < nodeIndent) break;
		}
		if (atExplicitKey) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
		if (detected) {
			state.tag = _tag;
			state.anchor = _anchor;
			state.kind = "mapping";
			state.result = _result;
		}
		return detected;
	}
	function readTagProperty(state) {
		let isVerbatim = false;
		let isNamed = false;
		let tagHandle;
		let tagName;
		let ch = state.input.charCodeAt(state.position);
		if (ch !== 33) return false;
		if (state.tag !== null) throwError(state, "duplication of a tag property");
		ch = state.input.charCodeAt(++state.position);
		if (ch === 60) {
			isVerbatim = true;
			ch = state.input.charCodeAt(++state.position);
		} else if (ch === 33) {
			isNamed = true;
			tagHandle = "!!";
			ch = state.input.charCodeAt(++state.position);
		} else tagHandle = "!";
		let _position = state.position;
		if (isVerbatim) {
			do
				ch = state.input.charCodeAt(++state.position);
			while (ch !== 0 && ch !== 62);
			if (state.position < state.length) {
				tagName = state.input.slice(_position, state.position);
				ch = state.input.charCodeAt(++state.position);
			} else throwError(state, "unexpected end of the stream within a verbatim tag");
		} else {
			while (ch !== 0 && !isWsOrEol(ch)) {
				if (ch === 33) if (!isNamed) {
					tagHandle = state.input.slice(_position - 1, state.position + 1);
					if (!PATTERN_TAG_HANDLE.test(tagHandle)) throwError(state, "named tag handle cannot contain such characters");
					isNamed = true;
					_position = state.position + 1;
				} else throwError(state, "tag suffix cannot contain exclamation marks");
				ch = state.input.charCodeAt(++state.position);
			}
			tagName = state.input.slice(_position, state.position);
			if (PATTERN_FLOW_INDICATORS.test(tagName)) throwError(state, "tag suffix cannot contain flow indicator characters");
		}
		if (tagName && !PATTERN_TAG_URI.test(tagName)) throwError(state, "tag name cannot contain such characters: " + tagName);
		try {
			tagName = decodeURIComponent(tagName);
		} catch (err) {
			throwError(state, "tag name is malformed: " + tagName);
		}
		if (isVerbatim) state.tag = tagName;
		else if (_hasOwnProperty.call(state.tagMap, tagHandle)) state.tag = state.tagMap[tagHandle] + tagName;
		else if (tagHandle === "!") state.tag = "!" + tagName;
		else if (tagHandle === "!!") state.tag = "tag:yaml.org,2002:" + tagName;
		else throwError(state, "undeclared tag handle \"" + tagHandle + "\"");
		return true;
	}
	function readAnchorProperty(state) {
		let ch = state.input.charCodeAt(state.position);
		if (ch !== 38) return false;
		if (state.anchor !== null) throwError(state, "duplication of an anchor property");
		ch = state.input.charCodeAt(++state.position);
		const _position = state.position;
		while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) ch = state.input.charCodeAt(++state.position);
		if (state.position === _position) throwError(state, "name of an anchor node must contain at least one character");
		state.anchor = state.input.slice(_position, state.position);
		return true;
	}
	function readAlias(state) {
		let ch = state.input.charCodeAt(state.position);
		if (ch !== 42) return false;
		ch = state.input.charCodeAt(++state.position);
		const _position = state.position;
		while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) ch = state.input.charCodeAt(++state.position);
		if (state.position === _position) throwError(state, "name of an alias node must contain at least one character");
		const alias = state.input.slice(_position, state.position);
		if (!_hasOwnProperty.call(state.anchorMap, alias)) throwError(state, "unidentified alias \"" + alias + "\"");
		state.result = state.anchorMap[alias];
		skipSeparationSpace(state, true, -1);
		return true;
	}
	function tryReadBlockMappingFromProperty(state, propertyStart, nodeIndent, flowIndent) {
		const fallbackState = snapshotState(state);
		beginAnchorTransaction(state);
		restoreState(state, propertyStart);
		state.tag = null;
		state.anchor = null;
		state.kind = null;
		state.result = null;
		if (readBlockMapping(state, nodeIndent, flowIndent) && state.kind === "mapping") {
			commitAnchorTransaction(state);
			return true;
		}
		rollbackAnchorTransaction(state);
		restoreState(state, fallbackState);
		return false;
	}
	function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
		let allowBlockScalars;
		let allowBlockCollections;
		let indentStatus = 1;
		let atNewLine = false;
		let hasContent = false;
		let propertyStart = null;
		let type2;
		let flowIndent;
		let blockIndent;
		if (state.depth >= state.maxDepth) throwError(state, "nesting exceeded maxDepth (" + state.maxDepth + ")");
		state.depth += 1;
		if (state.listener !== null) state.listener("open", state);
		state.tag = null;
		state.anchor = null;
		state.kind = null;
		state.result = null;
		const allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
		if (allowToSeek) {
			if (skipSeparationSpace(state, true, -1)) {
				atNewLine = true;
				if (state.lineIndent > parentIndent) indentStatus = 1;
				else if (state.lineIndent === parentIndent) indentStatus = 0;
				else if (state.lineIndent < parentIndent) indentStatus = -1;
			}
		}
		if (indentStatus === 1) while (true) {
			const ch = state.input.charCodeAt(state.position);
			const propertyState = snapshotState(state);
			if (atNewLine && (ch === 33 && state.tag !== null || ch === 38 && state.anchor !== null)) break;
			if (!readTagProperty(state) && !readAnchorProperty(state)) break;
			if (propertyStart === null) propertyStart = propertyState;
			if (skipSeparationSpace(state, true, -1)) {
				atNewLine = true;
				allowBlockCollections = allowBlockStyles;
				if (state.lineIndent > parentIndent) indentStatus = 1;
				else if (state.lineIndent === parentIndent) indentStatus = 0;
				else if (state.lineIndent < parentIndent) indentStatus = -1;
			} else allowBlockCollections = false;
		}
		if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
		if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
			if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) flowIndent = parentIndent;
			else flowIndent = parentIndent + 1;
			blockIndent = state.position - state.lineStart;
			if (indentStatus === 1) if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) hasContent = true;
			else {
				const ch = state.input.charCodeAt(state.position);
				if (propertyStart !== null && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62 && tryReadBlockMappingFromProperty(state, propertyStart, propertyStart.position - propertyStart.lineStart, flowIndent)) hasContent = true;
				else if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) hasContent = true;
				else if (readAlias(state)) {
					hasContent = true;
					if (state.tag !== null || state.anchor !== null) throwError(state, "alias node should not have any properties");
				} else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
					hasContent = true;
					if (state.tag === null) state.tag = "?";
				}
				if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
			}
			else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
		}
		if (state.tag === null) {
			if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
		} else if (state.tag === "?") {
			if (state.result !== null && state.kind !== "scalar") throwError(state, "unacceptable node kind for !<?> tag; it should be \"scalar\", not \"" + state.kind + "\"");
			for (let typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
				type2 = state.implicitTypes[typeIndex];
				if (type2.resolve(state.result)) {
					state.result = type2.construct(state.result);
					state.tag = type2.tag;
					if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
					break;
				}
			}
		} else if (state.tag !== "!") {
			if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) type2 = state.typeMap[state.kind || "fallback"][state.tag];
			else {
				type2 = null;
				const typeList = state.typeMap.multi[state.kind || "fallback"];
				for (let typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
					type2 = typeList[typeIndex];
					break;
				}
			}
			if (!type2) throwError(state, "unknown tag !<" + state.tag + ">");
			if (state.result !== null && type2.kind !== state.kind) throwError(state, "unacceptable node kind for !<" + state.tag + "> tag; it should be \"" + type2.kind + "\", not \"" + state.kind + "\"");
			if (!type2.resolve(state.result, state.tag)) throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
			else {
				state.result = type2.construct(state.result, state.tag);
				if (state.anchor !== null) storeAnchor(state, state.anchor, state.result);
			}
		}
		if (state.listener !== null) state.listener("close", state);
		state.depth -= 1;
		return state.tag !== null || state.anchor !== null || hasContent;
	}
	function readDocument(state) {
		const documentStart = state.position;
		let hasDirectives = false;
		let ch;
		state.version = null;
		state.checkLineBreaks = state.legacy;
		state.tagMap = /* @__PURE__ */ Object.create(null);
		state.anchorMap = /* @__PURE__ */ Object.create(null);
		while ((ch = state.input.charCodeAt(state.position)) !== 0) {
			skipSeparationSpace(state, true, -1);
			ch = state.input.charCodeAt(state.position);
			if (state.lineIndent > 0 || ch !== 37) break;
			hasDirectives = true;
			ch = state.input.charCodeAt(++state.position);
			let _position = state.position;
			while (ch !== 0 && !isWsOrEol(ch)) ch = state.input.charCodeAt(++state.position);
			const directiveName = state.input.slice(_position, state.position);
			const directiveArgs = [];
			if (directiveName.length < 1) throwError(state, "directive name must not be less than one character in length");
			while (ch !== 0) {
				while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
				if (ch === 35) {
					do
						ch = state.input.charCodeAt(++state.position);
					while (ch !== 0 && !isEol(ch));
					break;
				}
				if (isEol(ch)) break;
				_position = state.position;
				while (ch !== 0 && !isWsOrEol(ch)) ch = state.input.charCodeAt(++state.position);
				directiveArgs.push(state.input.slice(_position, state.position));
			}
			if (ch !== 0) readLineBreak(state);
			if (_hasOwnProperty.call(directiveHandlers, directiveName)) directiveHandlers[directiveName](state, directiveName, directiveArgs);
			else throwWarning(state, "unknown document directive \"" + directiveName + "\"");
		}
		skipSeparationSpace(state, true, -1);
		if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
			state.position += 3;
			skipSeparationSpace(state, true, -1);
		} else if (hasDirectives) throwError(state, "directives end mark is expected");
		composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
		skipSeparationSpace(state, true, -1);
		if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) throwWarning(state, "non-ASCII line breaks are interpreted as content");
		state.documents.push(state.result);
		if (state.position === state.lineStart && testDocumentSeparator(state)) {
			if (state.input.charCodeAt(state.position) === 46) {
				state.position += 3;
				skipSeparationSpace(state, true, -1);
			}
			return;
		}
		if (state.position < state.length - 1) throwError(state, "end of the stream or a document separator is expected");
	}
	function loadDocuments(input, options) {
		input = String(input);
		options = options || {};
		if (input.length !== 0) {
			if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) input += "\n";
			if (input.charCodeAt(0) === 65279) input = input.slice(1);
		}
		const state = new State(input, options);
		const nullpos = input.indexOf("\0");
		if (nullpos !== -1) {
			state.position = nullpos;
			throwError(state, "null byte is not allowed in input");
		}
		state.input += "\0";
		while (state.input.charCodeAt(state.position) === 32) {
			state.lineIndent += 1;
			state.position += 1;
		}
		while (state.position < state.length - 1) readDocument(state);
		return state.documents;
	}
	function loadAll2(input, iterator, options) {
		if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
			options = iterator;
			iterator = null;
		}
		const documents = loadDocuments(input, options);
		if (typeof iterator !== "function") return documents;
		for (let index = 0, length = documents.length; index < length; index += 1) iterator(documents[index]);
	}
	function load2(input, options) {
		const documents = loadDocuments(input, options);
		if (documents.length === 0) return;
		else if (documents.length === 1) return documents[0];
		throw new YAMLException2("expected a single document in the stream, but found more");
	}
	loader.loadAll = loadAll2;
	loader.load = load2;
	return loader;
}
function requireDumper() {
	if (hasRequiredDumper) return dumper;
	hasRequiredDumper = 1;
	const common2 = requireCommon();
	const YAMLException2 = requireException();
	const DEFAULT_SCHEMA2 = require_default();
	const _toString = Object.prototype.toString;
	const _hasOwnProperty = Object.prototype.hasOwnProperty;
	const CHAR_BOM = 65279;
	const CHAR_TAB = 9;
	const CHAR_LINE_FEED = 10;
	const CHAR_CARRIAGE_RETURN = 13;
	const CHAR_SPACE = 32;
	const CHAR_EXCLAMATION = 33;
	const CHAR_DOUBLE_QUOTE = 34;
	const CHAR_SHARP = 35;
	const CHAR_PERCENT = 37;
	const CHAR_AMPERSAND = 38;
	const CHAR_SINGLE_QUOTE = 39;
	const CHAR_ASTERISK = 42;
	const CHAR_COMMA = 44;
	const CHAR_MINUS = 45;
	const CHAR_COLON = 58;
	const CHAR_EQUALS = 61;
	const CHAR_GREATER_THAN = 62;
	const CHAR_QUESTION = 63;
	const CHAR_COMMERCIAL_AT = 64;
	const CHAR_LEFT_SQUARE_BRACKET = 91;
	const CHAR_RIGHT_SQUARE_BRACKET = 93;
	const CHAR_GRAVE_ACCENT = 96;
	const CHAR_LEFT_CURLY_BRACKET = 123;
	const CHAR_VERTICAL_LINE = 124;
	const CHAR_RIGHT_CURLY_BRACKET = 125;
	const ESCAPE_SEQUENCES = {};
	ESCAPE_SEQUENCES[0] = "\\0";
	ESCAPE_SEQUENCES[7] = "\\a";
	ESCAPE_SEQUENCES[8] = "\\b";
	ESCAPE_SEQUENCES[9] = "\\t";
	ESCAPE_SEQUENCES[10] = "\\n";
	ESCAPE_SEQUENCES[11] = "\\v";
	ESCAPE_SEQUENCES[12] = "\\f";
	ESCAPE_SEQUENCES[13] = "\\r";
	ESCAPE_SEQUENCES[27] = "\\e";
	ESCAPE_SEQUENCES[34] = "\\\"";
	ESCAPE_SEQUENCES[92] = "\\\\";
	ESCAPE_SEQUENCES[133] = "\\N";
	ESCAPE_SEQUENCES[160] = "\\_";
	ESCAPE_SEQUENCES[8232] = "\\L";
	ESCAPE_SEQUENCES[8233] = "\\P";
	const DEPRECATED_BOOLEANS_SYNTAX = [
		"y",
		"Y",
		"yes",
		"Yes",
		"YES",
		"on",
		"On",
		"ON",
		"n",
		"N",
		"no",
		"No",
		"NO",
		"off",
		"Off",
		"OFF"
	];
	const DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
	function compileStyleMap(schema2, map2) {
		if (map2 === null) return {};
		const result = {};
		const keys = Object.keys(map2);
		for (let index = 0, length = keys.length; index < length; index += 1) {
			let tag = keys[index];
			let style = String(map2[tag]);
			if (tag.slice(0, 2) === "!!") tag = "tag:yaml.org,2002:" + tag.slice(2);
			const type2 = schema2.compiledTypeMap["fallback"][tag];
			if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) style = type2.styleAliases[style];
			result[tag] = style;
		}
		return result;
	}
	function encodeHex(character) {
		let handle;
		let length;
		const string = character.toString(16).toUpperCase();
		if (character <= 255) {
			handle = "x";
			length = 2;
		} else if (character <= 65535) {
			handle = "u";
			length = 4;
		} else if (character <= 4294967295) {
			handle = "U";
			length = 8;
		} else throw new YAMLException2("code point within a string may not be greater than 0xFFFFFFFF");
		return "\\" + handle + common2.repeat("0", length - string.length) + string;
	}
	const QUOTING_TYPE_SINGLE = 1;
	const QUOTING_TYPE_DOUBLE = 2;
	function State(options) {
		this.schema = options["schema"] || DEFAULT_SCHEMA2;
		this.indent = Math.max(1, options["indent"] || 2);
		this.noArrayIndent = options["noArrayIndent"] || false;
		this.skipInvalid = options["skipInvalid"] || false;
		this.flowLevel = common2.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
		this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
		this.sortKeys = options["sortKeys"] || false;
		this.lineWidth = options["lineWidth"] || 80;
		this.noRefs = options["noRefs"] || false;
		this.noCompatMode = options["noCompatMode"] || false;
		this.condenseFlow = options["condenseFlow"] || false;
		this.quotingType = options["quotingType"] === "\"" ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
		this.forceQuotes = options["forceQuotes"] || false;
		this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
		this.implicitTypes = this.schema.compiledImplicit;
		this.explicitTypes = this.schema.compiledExplicit;
		this.tag = null;
		this.result = "";
		this.duplicates = [];
		this.usedDuplicates = null;
	}
	function indentString(string, spaces) {
		const ind = common2.repeat(" ", spaces);
		let position = 0;
		let result = "";
		const length = string.length;
		while (position < length) {
			let line;
			const next = string.indexOf("\n", position);
			if (next === -1) {
				line = string.slice(position);
				position = length;
			} else {
				line = string.slice(position, next + 1);
				position = next + 1;
			}
			if (line.length && line !== "\n") result += ind;
			result += line;
		}
		return result;
	}
	function generateNextLine(state, level) {
		return "\n" + common2.repeat(" ", state.indent * level);
	}
	function testImplicitResolving(state, str2) {
		for (let index = 0, length = state.implicitTypes.length; index < length; index += 1) if (state.implicitTypes[index].resolve(str2)) return true;
		return false;
	}
	function isWhitespace(c) {
		return c === CHAR_SPACE || c === CHAR_TAB;
	}
	function isPrintable(c) {
		return c >= 32 && c <= 126 || c >= 161 && c <= 55295 && c !== 8232 && c !== 8233 || c >= 57344 && c <= 65533 && c !== CHAR_BOM || c >= 65536 && c <= 1114111;
	}
	function isNsCharOrWhitespace(c) {
		return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
	}
	function isPlainSafe(c, prev, inblock) {
		const cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
		const cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
		return (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar;
	}
	function isPlainSafeFirst(c) {
		return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
	}
	function isPlainSafeLast(c) {
		return !isWhitespace(c) && c !== CHAR_COLON;
	}
	function codePointAt(string, pos) {
		const first = string.charCodeAt(pos);
		let second;
		if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
			second = string.charCodeAt(pos + 1);
			if (second >= 56320 && second <= 57343) return (first - 55296) * 1024 + second - 56320 + 65536;
		}
		return first;
	}
	function needIndentIndicator(string) {
		return /^\n* /.test(string);
	}
	const STYLE_PLAIN = 1;
	const STYLE_SINGLE = 2;
	const STYLE_LITERAL = 3;
	const STYLE_FOLDED = 4;
	const STYLE_DOUBLE = 5;
	function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
		let i;
		let char = 0;
		let prevChar = null;
		let hasLineBreak = false;
		let hasFoldableLine = false;
		const shouldTrackWidth = lineWidth !== -1;
		let previousLineBreak = -1;
		let plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
		if (singleLineOnly || forceQuotes) for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
			char = codePointAt(string, i);
			if (!isPrintable(char)) return STYLE_DOUBLE;
			plain = plain && isPlainSafe(char, prevChar, inblock);
			prevChar = char;
		}
		else {
			for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
				char = codePointAt(string, i);
				if (char === CHAR_LINE_FEED) {
					hasLineBreak = true;
					if (shouldTrackWidth) {
						hasFoldableLine = hasFoldableLine || i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
						previousLineBreak = i;
					}
				} else if (!isPrintable(char)) return STYLE_DOUBLE;
				plain = plain && isPlainSafe(char, prevChar, inblock);
				prevChar = char;
			}
			hasFoldableLine = hasFoldableLine || shouldTrackWidth && i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
		}
		if (!hasLineBreak && !hasFoldableLine) {
			if (plain && !forceQuotes && !testAmbiguousType(string)) return STYLE_PLAIN;
			return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
		}
		if (indentPerLevel > 9 && needIndentIndicator(string)) return STYLE_DOUBLE;
		if (!forceQuotes) return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
		return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
	}
	function writeScalar(state, string, level, iskey, inblock) {
		state.dump = (function() {
			if (string.length === 0) return state.quotingType === QUOTING_TYPE_DOUBLE ? "\"\"" : "''";
			if (!state.noCompatMode) {
				if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) return state.quotingType === QUOTING_TYPE_DOUBLE ? "\"" + string + "\"" : "'" + string + "'";
			}
			const indent = state.indent * Math.max(1, level);
			const lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
			const singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
			function testAmbiguity(string2) {
				return testImplicitResolving(state, string2);
			}
			switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity, state.quotingType, state.forceQuotes && !iskey, inblock)) {
				case STYLE_PLAIN: return string;
				case STYLE_SINGLE: return "'" + string.replace(/'/g, "''") + "'";
				case STYLE_LITERAL: return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
				case STYLE_FOLDED: return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
				case STYLE_DOUBLE: return "\"" + escapeString(string) + "\"";
				default: throw new YAMLException2("impossible error: invalid scalar style");
			}
		})();
	}
	function blockHeader(string, indentPerLevel) {
		const indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
		const clip = string[string.length - 1] === "\n";
		return indentIndicator + (clip && (string[string.length - 2] === "\n" || string === "\n") ? "+" : clip ? "" : "-") + "\n";
	}
	function dropEndingNewline(string) {
		return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
	}
	function foldString(string, width) {
		const lineRe = /(\n+)([^\n]*)/g;
		let result = (function() {
			let nextLF = string.indexOf("\n");
			nextLF = nextLF !== -1 ? nextLF : string.length;
			lineRe.lastIndex = nextLF;
			return foldLine(string.slice(0, nextLF), width);
		})();
		let prevMoreIndented = string[0] === "\n" || string[0] === " ";
		let moreIndented;
		let match;
		while (match = lineRe.exec(string)) {
			const prefix = match[1];
			const line = match[2];
			moreIndented = line[0] === " ";
			result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
			prevMoreIndented = moreIndented;
		}
		return result;
	}
	function foldLine(line, width) {
		if (line === "" || line[0] === " ") return line;
		const breakRe = / [^ ]/g;
		let match;
		let start = 0;
		let end;
		let curr = 0;
		let next = 0;
		let result = "";
		while (match = breakRe.exec(line)) {
			next = match.index;
			if (next - start > width) {
				end = curr > start ? curr : next;
				result += "\n" + line.slice(start, end);
				start = end + 1;
			}
			curr = next;
		}
		result += "\n";
		if (line.length - start > width && curr > start) result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
		else result += line.slice(start);
		return result.slice(1);
	}
	function escapeString(string) {
		let result = "";
		let char = 0;
		for (let i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
			char = codePointAt(string, i);
			const escapeSeq = ESCAPE_SEQUENCES[char];
			if (!escapeSeq && isPrintable(char)) {
				result += string[i];
				if (char >= 65536) result += string[i + 1];
			} else result += escapeSeq || encodeHex(char);
		}
		return result;
	}
	function writeFlowSequence(state, level, object) {
		let _result = "";
		const _tag = state.tag;
		for (let index = 0, length = object.length; index < length; index += 1) {
			let value = object[index];
			if (state.replacer) value = state.replacer.call(object, String(index), value);
			if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
				if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
				_result += state.dump;
			}
		}
		state.tag = _tag;
		state.dump = "[" + _result + "]";
	}
	function writeBlockSequence(state, level, object, compact) {
		let _result = "";
		const _tag = state.tag;
		for (let index = 0, length = object.length; index < length; index += 1) {
			let value = object[index];
			if (state.replacer) value = state.replacer.call(object, String(index), value);
			if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
				if (!compact || _result !== "") _result += generateNextLine(state, level);
				if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) _result += "-";
				else _result += "- ";
				_result += state.dump;
			}
		}
		state.tag = _tag;
		state.dump = _result || "[]";
	}
	function writeFlowMapping(state, level, object) {
		let _result = "";
		const _tag = state.tag;
		const objectKeyList = Object.keys(object);
		for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
			let pairBuffer = "";
			if (_result !== "") pairBuffer += ", ";
			if (state.condenseFlow) pairBuffer += "\"";
			const objectKey = objectKeyList[index];
			let objectValue = object[objectKey];
			if (state.replacer) objectValue = state.replacer.call(object, objectKey, objectValue);
			if (!writeNode(state, level, objectKey, false, false)) continue;
			if (state.dump.length > 1024) pairBuffer += "? ";
			pairBuffer += state.dump + (state.condenseFlow ? "\"" : "") + ":" + (state.condenseFlow ? "" : " ");
			if (!writeNode(state, level, objectValue, false, false)) continue;
			pairBuffer += state.dump;
			_result += pairBuffer;
		}
		state.tag = _tag;
		state.dump = "{" + _result + "}";
	}
	function writeBlockMapping(state, level, object, compact) {
		let _result = "";
		const _tag = state.tag;
		const objectKeyList = Object.keys(object);
		if (state.sortKeys === true) objectKeyList.sort();
		else if (typeof state.sortKeys === "function") objectKeyList.sort(state.sortKeys);
		else if (state.sortKeys) throw new YAMLException2("sortKeys must be a boolean or a function");
		for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
			let pairBuffer = "";
			if (!compact || _result !== "") pairBuffer += generateNextLine(state, level);
			const objectKey = objectKeyList[index];
			let objectValue = object[objectKey];
			if (state.replacer) objectValue = state.replacer.call(object, objectKey, objectValue);
			if (!writeNode(state, level + 1, objectKey, true, true, true)) continue;
			const explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
			if (explicitPair) if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) pairBuffer += "?";
			else pairBuffer += "? ";
			pairBuffer += state.dump;
			if (explicitPair) pairBuffer += generateNextLine(state, level);
			if (!writeNode(state, level + 1, objectValue, true, explicitPair)) continue;
			if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) pairBuffer += ":";
			else pairBuffer += ": ";
			pairBuffer += state.dump;
			_result += pairBuffer;
		}
		state.tag = _tag;
		state.dump = _result || "{}";
	}
	function detectType(state, object, explicit) {
		const typeList = explicit ? state.explicitTypes : state.implicitTypes;
		for (let index = 0, length = typeList.length; index < length; index += 1) {
			const type2 = typeList[index];
			if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
				if (explicit) if (type2.multi && type2.representName) state.tag = type2.representName(object);
				else state.tag = type2.tag;
				else state.tag = "?";
				if (type2.represent) {
					const style = state.styleMap[type2.tag] || type2.defaultStyle;
					let _result;
					if (_toString.call(type2.represent) === "[object Function]") _result = type2.represent(object, style);
					else if (_hasOwnProperty.call(type2.represent, style)) _result = type2.represent[style](object, style);
					else throw new YAMLException2("!<" + type2.tag + "> tag resolver accepts not \"" + style + "\" style");
					state.dump = _result;
				}
				return true;
			}
		}
		return false;
	}
	function writeNode(state, level, object, block, compact, iskey, isblockseq) {
		state.tag = null;
		state.dump = object;
		if (!detectType(state, object, false)) detectType(state, object, true);
		const type2 = _toString.call(state.dump);
		const inblock = block;
		if (block) block = state.flowLevel < 0 || state.flowLevel > level;
		const objectOrArray = type2 === "[object Object]" || type2 === "[object Array]";
		let duplicateIndex;
		let duplicate;
		if (objectOrArray) {
			duplicateIndex = state.duplicates.indexOf(object);
			duplicate = duplicateIndex !== -1;
		}
		if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) compact = false;
		if (duplicate && state.usedDuplicates[duplicateIndex]) state.dump = "*ref_" + duplicateIndex;
		else {
			if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) state.usedDuplicates[duplicateIndex] = true;
			if (type2 === "[object Object]") if (block && Object.keys(state.dump).length !== 0) {
				writeBlockMapping(state, level, state.dump, compact);
				if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
			} else {
				writeFlowMapping(state, level, state.dump);
				if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
			}
			else if (type2 === "[object Array]") if (block && state.dump.length !== 0) {
				if (state.noArrayIndent && !isblockseq && level > 0) writeBlockSequence(state, level - 1, state.dump, compact);
				else writeBlockSequence(state, level, state.dump, compact);
				if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
			} else {
				writeFlowSequence(state, level, state.dump);
				if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
			}
			else if (type2 === "[object String]") {
				if (state.tag !== "?") writeScalar(state, state.dump, level, iskey, inblock);
			} else if (type2 === "[object Undefined]") return false;
			else {
				if (state.skipInvalid) return false;
				throw new YAMLException2("unacceptable kind of an object to dump " + type2);
			}
			if (state.tag !== null && state.tag !== "?") {
				let tagStr = encodeURI(state.tag[0] === "!" ? state.tag.slice(1) : state.tag).replace(/!/g, "%21");
				if (state.tag[0] === "!") tagStr = "!" + tagStr;
				else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") tagStr = "!!" + tagStr.slice(18);
				else tagStr = "!<" + tagStr + ">";
				state.dump = tagStr + " " + state.dump;
			}
		}
		return true;
	}
	function getDuplicateReferences(object, state) {
		const objects = [];
		const duplicatesIndexes = [];
		inspectNode(object, objects, duplicatesIndexes);
		const length = duplicatesIndexes.length;
		for (let index = 0; index < length; index += 1) state.duplicates.push(objects[duplicatesIndexes[index]]);
		state.usedDuplicates = new Array(length);
	}
	function inspectNode(object, objects, duplicatesIndexes) {
		if (object !== null && typeof object === "object") {
			const index = objects.indexOf(object);
			if (index !== -1) {
				if (duplicatesIndexes.indexOf(index) === -1) duplicatesIndexes.push(index);
			} else {
				objects.push(object);
				if (Array.isArray(object)) for (let i = 0, length = object.length; i < length; i += 1) inspectNode(object[i], objects, duplicatesIndexes);
				else {
					const objectKeyList = Object.keys(object);
					for (let i = 0, length = objectKeyList.length; i < length; i += 1) inspectNode(object[objectKeyList[i]], objects, duplicatesIndexes);
				}
			}
		}
	}
	function dump2(input, options) {
		options = options || {};
		const state = new State(options);
		if (!state.noRefs) getDuplicateReferences(input, state);
		let value = input;
		if (state.replacer) value = state.replacer.call({ "": value }, "", value);
		if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
		return "";
	}
	dumper.dump = dump2;
	return dumper;
}
function requireJsYaml() {
	if (hasRequiredJsYaml) return jsYaml;
	hasRequiredJsYaml = 1;
	const loader2 = requireLoader();
	const dumper2 = requireDumper();
	function renamed(from, to) {
		return function() {
			throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
		};
	}
	jsYaml.Type = requireType();
	jsYaml.Schema = requireSchema();
	jsYaml.FAILSAFE_SCHEMA = requireFailsafe();
	jsYaml.JSON_SCHEMA = requireJson();
	jsYaml.CORE_SCHEMA = requireCore();
	jsYaml.DEFAULT_SCHEMA = require_default();
	jsYaml.load = loader2.load;
	jsYaml.loadAll = loader2.loadAll;
	jsYaml.dump = dumper2.dump;
	jsYaml.YAMLException = requireException();
	jsYaml.types = {
		binary: requireBinary(),
		float: requireFloat(),
		map: requireMap(),
		null: require_null(),
		pairs: requirePairs(),
		set: requireSet(),
		timestamp: requireTimestamp(),
		bool: requireBool(),
		int: requireInt(),
		merge: requireMerge(),
		omap: requireOmap(),
		seq: requireSeq(),
		str: requireStr()
	};
	jsYaml.safeLoad = renamed("safeLoad", "load");
	jsYaml.safeLoadAll = renamed("safeLoadAll", "loadAll");
	jsYaml.safeDump = renamed("safeDump", "dump");
	return jsYaml;
}
var jsYaml, loader, common, hasRequiredCommon, exception, hasRequiredException, snippet, hasRequiredSnippet, type, hasRequiredType, schema, hasRequiredSchema, str, hasRequiredStr, seq, hasRequiredSeq, map, hasRequiredMap, failsafe, hasRequiredFailsafe, _null, hasRequired_null, bool, hasRequiredBool, int, hasRequiredInt, float, hasRequiredFloat, json, hasRequiredJson, core, hasRequiredCore, timestamp, hasRequiredTimestamp, merge, hasRequiredMerge, binary, hasRequiredBinary, omap, hasRequiredOmap, pairs, hasRequiredPairs, set, hasRequiredSet, _default, hasRequired_default, hasRequiredLoader, dumper, hasRequiredDumper, hasRequiredJsYaml, yaml, Type, Schema, FAILSAFE_SCHEMA, JSON_SCHEMA, CORE_SCHEMA, DEFAULT_SCHEMA, load, loadAll, dump, YAMLException, types, safeLoad, safeLoadAll, safeDump;
var init_js_yaml = __esmMin((() => {
	jsYaml = {};
	loader = {};
	common = {};
	dumper = {};
	yaml = /* @__PURE__ */ getDefaultExportFromCjs(requireJsYaml());
	({Type, Schema, FAILSAFE_SCHEMA, JSON_SCHEMA, CORE_SCHEMA, DEFAULT_SCHEMA, load, loadAll, dump, YAMLException, types, safeLoad, safeLoadAll, safeDump} = yaml);
}));
//#endregion
//#region src/lib/frontmatter.ts
function stripCr(line) {
	return line.endsWith("\r") ? line.slice(0, -1) : line;
}
function isClosingLine(line) {
	return stripCr(line).trimEnd() === DELIMITER;
}
/**
* Parse the YAML block into a plain object. js-yaml 4's load() is safe by
* default (no !!js/* tags); an empty / comments-only document yields
* undefined, and a scalar or sequence document is not entry data — both
* read as {}.
*/
function parseMapping(block) {
	const parsed = load(block);
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
	return parsed;
}
/**
* Split a Markdown file into its YAML frontmatter and body.
* Throws on a non-YAML language suffix, an unclosed block, or invalid YAML;
* the lenient read path (parseEntry) turns every throw into _parseError.
*/
function splitFrontmatter(raw) {
	const text = raw.charCodeAt(0) === 65279 ? raw.slice(1) : raw;
	const firstBreak = text.indexOf("\n");
	const firstLine = stripCr(firstBreak === -1 ? text : text.slice(0, firstBreak));
	if (!firstLine.startsWith(DELIMITER)) return {
		data: {},
		content: text
	};
	const language = firstLine.slice(3).trim();
	if (!ALLOWED_LANGUAGES.has(language.toLowerCase())) throw new Error(`frontmatter language "${language}" is not allowed — entries are YAML only`);
	if (firstBreak === -1) throw new Error("frontmatter opened with --- but never closed");
	const lines = text.slice(firstBreak + 1).split("\n");
	const closeIdx = lines.findIndex(isClosingLine);
	if (closeIdx === -1) throw new Error("frontmatter opened with --- but never closed");
	return {
		data: parseMapping(lines.slice(0, closeIdx).join("\n")),
		content: lines.slice(closeIdx + 1).join("\n")
	};
}
var DELIMITER, ALLOWED_LANGUAGES;
var init_frontmatter = __esmMin((() => {
	init_js_yaml();
	DELIMITER = "---";
	ALLOWED_LANGUAGES = new Set([
		"",
		"yaml",
		"yml"
	]);
}));
//#endregion
//#region src/lib/parse-entry.ts
/**
* Coerce a value to an array. Returns wasScalar=true when the raw value
* was a non-array (scalar coercion was applied).
*
* SCHEMA.md Pitfall 2: bare scalar "tags: schema" parses as string — must coerce.
* ANY defined non-array scalar counts (string, number, boolean, …): js-yaml
* parses `tags: 123` as a number, and strict validate must flag it via
* _scalarFields exactly like the string case — never silently drop the data.
*/
function toArrayResult(v) {
	if (Array.isArray(v)) return {
		value: v.filter(Boolean).map(String),
		wasScalar: false
	};
	if (v === void 0 || v === null || v === "") return {
		value: [],
		wasScalar: false
	};
	return {
		value: [String(v)],
		wasScalar: true
	};
}
/**
* Normalize a date value to a YYYY-MM-DD string.
*
* SCHEMA.md Pitfall 1: unquoted "date: 2026-06-01" is parsed by js-yaml as a
* JavaScript Date object. Normalize it back to a string here.
*/
function normDate(v) {
	if (typeof v === "string") return v;
	if (v instanceof Date) return v.toISOString().slice(0, 10);
	return String(v ?? "");
}
/**
* Normalize an identity-bearing scalar (id, slug) to a string, preserving
* undefined/null so MISSING_FIELD checks still fire.
*
* Unquoted `id: 2026-01-02` parses as a JS Date (mirror normDate's handling)
* and an unquoted all-digit `id: 20260101` parses as a number — both must
* become strings so ParsedEntry honors its typed contract and strict
* validate (entry.id.slice) never crashes on a malformed entry.
*/
function normOptionalString(v) {
	if (v === void 0 || v === null) return void 0;
	if (typeof v === "string") return v;
	if (v instanceof Date) return v.toISOString().slice(0, 10);
	return String(v);
}
/**
* Detect which canonical headings are present in the body.
*
* Fence-aware line scan: a heading counts only when a line equals the
* canonical string outside a ``` / ~~~ code fence — a fenced example of
* the entry format must not register as a real section (same rule as
* countOpenFollowUps in rank-entries.ts).
*/
function detectSections(content) {
	const present = /* @__PURE__ */ new Set();
	let inFence = false;
	for (const line of content.split("\n")) {
		const trimmed = line.trimEnd();
		if (/^\s*(```|~~~)/.test(trimmed)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		if (CANONICAL_HEADINGS.includes(trimmed)) present.add(trimmed);
	}
	return CANONICAL_HEADINGS.filter((h) => present.has(h));
}
/**
* Parse a single changelog entry file leniently.
*
* Always returns a ParsedEntry — never throws.
* On a YAML error, a refused non-YAML frontmatter language, or an unclosed
* frontmatter block: returns { _file, _stem, _parseError: true }.
*
* Handles all three SCHEMA.md §Parser Notes pitfalls:
*   Pitfall 1 — date coercion (Date → YYYY-MM-DD string)
*   Pitfall 2 — scalar-to-array coercion for tags/files/links/supersedes
*   Pitfall 3 — YAMLException caught, returns _parseError flag
*/
function parseEntry(filePath, rawContent) {
	const stem = path.basename(filePath, ".md");
	try {
		const { data, content } = splitFrontmatter(rawContent);
		const extra = {};
		for (const [key, value] of Object.entries(data)) if (!RESERVED_KEYS.has(key)) extra[key] = value;
		const tagsResult = toArrayResult(data.tags);
		const filesResult = toArrayResult(data.files);
		const linksResult = toArrayResult(data.links);
		const supersResult = toArrayResult(data.supersedes);
		const scalarFields = [];
		if (tagsResult.wasScalar) scalarFields.push("tags");
		if (filesResult.wasScalar) scalarFields.push("files");
		if (linksResult.wasScalar) scalarFields.push("links");
		if (supersResult.wasScalar) scalarFields.push("supersedes");
		const sections = detectSections(content);
		return {
			...extra,
			_file: filePath,
			_stem: stem,
			id: normOptionalString(data.id),
			slug: normOptionalString(data.slug),
			date: normDate(data.date),
			tags: tagsResult.value,
			files: filesResult.value,
			links: linksResult.value,
			supersedes: supersResult.value,
			_scalarFields: scalarFields,
			_sections: sections
		};
	} catch {
		return {
			_file: filePath,
			_stem: stem,
			_parseError: true
		};
	}
}
var CANONICAL_HEADINGS, RESERVED_KEYS;
var init_parse_entry = __esmMin((() => {
	init_frontmatter();
	CANONICAL_HEADINGS = [
		"## What changed",
		"## Why / decisions",
		"## Alternatives rejected",
		"## Gotchas / risks",
		"## Verify-later / follow-ups"
	];
	RESERVED_KEYS = new Set([
		"_file",
		"_stem",
		"_parseError",
		"_sections",
		"_scalarFields"
	]);
}));
//#endregion
//#region src/lib/glob-entries.ts
/**
* Glob all changelog entry files in a directory, parse each one leniently.
*
* Excludes INDEX.md and manifest.json by basename.
* Uses Promise.all for parallel file reads.
*
* @param changelogDir - Absolute path to the .whydone/ directory
* @returns Array of ParsedEntry objects (may include entries with _parseError: true)
*/
async function globEntries(changelogDir) {
	const entryFiles = (await glob("*.md", {
		cwd: changelogDir,
		absolute: true
	})).filter((f) => !EXCLUDED_BASENAMES.has(path.basename(f)));
	return await Promise.all(entryFiles.map(async (f) => {
		return parseEntry(f, await readFile(f, "utf-8"));
	}));
}
var EXCLUDED_BASENAMES;
var init_glob_entries = __esmMin((() => {
	init_dist$4();
	init_parse_entry();
	EXCLUDED_BASENAMES = new Set(["INDEX.md", "manifest.json"]);
}));
//#endregion
//#region src/commands/build-index.ts
var build_index_exports = /* @__PURE__ */ __exportAll({
	buildIndexContent: () => buildIndexContent,
	buildManifest: () => buildManifest,
	buildManifestEntries: () => buildManifestEntries,
	default: () => build_index_default,
	toIndexRow: () => toIndexRow,
	toManifestEntry: () => toManifestEntry
});
/**
* Sanitize a value for use as a markdown pipe-table cell: escape `|` as `\|`
* and collapse newlines to spaces. Frontmatter like `task: "a | b"` or a YAML
* block-scalar task is schema-valid input and must never break INDEX.md's
* table structure (one row per entry, columns aligned).
*/
function cell(v) {
	return String(v ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}
/**
* Build a single markdown pipe-table row from a ParsedEntry.
*
* For parse errors: produces "| [PARSE ERROR] | {stem} | — | — | — |"
* For normal entries: truncates files to first 3 + "+N" suffix when > 3.
* All cell values are pipe-escaped and newline-collapsed via cell().
*/
function toIndexRow(e) {
	if (e._parseError) return `| [PARSE ERROR] | ${cell(e._stem)} | — | — | — |`;
	const slug = e.slug ?? e._stem;
	const task = e.task ?? "";
	const date = e.date ?? "";
	const tags = (e.tags ?? []).join(", ");
	const rawFiles = e.files ?? [];
	let filesDisplay;
	if (rawFiles.length > 3) filesDisplay = [...rawFiles.slice(0, 3), `+${rawFiles.length - 3}`].join(", ");
	else filesDisplay = rawFiles.join(", ");
	return `| ${cell(date)} | ${cell(slug)} | ${cell(task)} | ${cell(tags)} | ${cell(filesDisplay)} |`;
}
/**
* Build the full INDEX.md content from a list of entries.
*
* Entries are sorted newest-first by date string (YYYY-MM-DD lexicographic
* descending), tie-broken by id desc (falling back to _stem) — mirroring
* compareDateIdDesc in rank-entries.ts. Without the tie-break, same-date
* rows keep glob input order, and readdir order differs across filesystems,
* producing spurious diffs in this committed file.
* Empty entries → header + separator only (no crash).
*/
function buildIndexContent(entries) {
	return [
		"| date | slug | task | tags | files |",
		"|------|------|------|------|-------|",
		...[...entries].sort((a, b) => {
			const da = a.date ?? "";
			const db = b.date ?? "";
			if (da > db) return -1;
			if (da < db) return 1;
			const ia = String(a.id ?? a._stem);
			const ib = String(b.id ?? b._stem);
			if (ia > ib) return -1;
			if (ia < ib) return 1;
			return 0;
		}).map(toIndexRow)
	].join("\n") + "\n";
}
/**
* Convert a ParsedEntry to a ManifestEntry.
*
* _supersededBy is always initialized to [] here; it is populated in
* buildManifest() via a second pass over the supersedes[] fields.
*
* Scalar fields are String()-coerced: YAML-valid frontmatter like
* `task: 12345` or `slug: 42` parses as a number (no _parseError), and
* the lenient-read contract says malformed entries must degrade, never
* crash downstream consumers (recall's keyword haystack calls
* .toLowerCase()). For valid entries String() is the identity, so
* index output is unchanged.
*/
function toManifestEntry(e) {
	return {
		id: String(e.id ?? e._stem),
		date: e.date ?? "",
		slug: String(e.slug ?? ""),
		task: String(e.task ?? ""),
		status: String(e.status ?? "done"),
		tags: e.tags ?? [],
		files: e.files ?? [],
		links: e.links ?? [],
		supersedes: e.supersedes ?? [],
		_sections: e._sections ?? [],
		_parseError: e._parseError ?? false,
		_supersededBy: []
	};
}
/**
* Build the manifest entry array from a list of entries.
*
* Two-pass algorithm:
*   Pass 1: map entries → ManifestEntry[], sort newest-first by date.
*   Pass 2: build id→index map; for each manifest entry me, iterate
*           me.supersedes[] and push me.id into the referenced entry's
*           _supersededBy array.
*
* Consumed directly by `whydone recall` (fresh in-memory ranking corpus)
* and serialized to manifest.json by buildManifest() below.
*/
function buildManifestEntries(entries) {
	const manifestEntries = entries.map(toManifestEntry).sort((a, b) => {
		if (a.date > b.date) return -1;
		if (a.date < b.date) return 1;
		if (a.id > b.id) return -1;
		if (a.id < b.id) return 1;
		return 0;
	});
	const idToIndex = /* @__PURE__ */ new Map();
	manifestEntries.forEach((me, i) => {
		idToIndex.set(me.id, i);
	});
	for (const me of manifestEntries) for (const supersededId of me.supersedes) {
		const idx = idToIndex.get(supersededId);
		if (idx !== void 0) manifestEntries[idx]._supersededBy.push(me.id);
	}
	return manifestEntries;
}
/**
* Build the full manifest.json content from a list of entries.
*
* Thin wrapper over buildManifestEntries() — output stays byte-identical
* to the pre-refactor implementation.
*/
function buildManifest(entries) {
	return JSON.stringify(buildManifestEntries(entries), null, 2);
}
var import_picocolors$6, build_index_default;
var init_build_index = __esmMin((() => {
	init_dist$6();
	import_picocolors$6 = /* @__PURE__ */ __toESM(require_picocolors(), 1);
	init_constants();
	init_glob_entries();
	build_index_default = defineCommand({
		meta: {
			name: "index",
			description: "Rebuild INDEX.md and manifest.json from .whydone/*.md entries"
		},
		args: {
			path: {
				type: "positional",
				description: "Path to the .whydone directory (default: .whydone)",
				required: false,
				default: JOURNAL_DIR
			},
			json: {
				type: "boolean",
				description: "Emit JSON summary to stdout (files are always written)",
				default: false
			},
			"dry-run": {
				type: "boolean",
				description: "Print what would be written without touching disk",
				default: false
			},
			quiet: {
				type: "boolean",
				description: "Suppress non-error output",
				default: false
			},
			"no-color": {
				type: "boolean",
				description: "Disable color output",
				default: false
			}
		},
		async run({ args }) {
			const changelogDir = path.resolve(process.cwd(), args.path ?? ".whydone");
			const projectRoot = process.cwd();
			if (changelogDir !== projectRoot && !changelogDir.startsWith(projectRoot + path.sep)) {
				process.stderr.write(`error: path traversal detected — resolved changelogDir is outside project root\n`);
				process.exit(1);
			}
			const entries = await globEntries(changelogDir);
			const indexContent = buildIndexContent(entries);
			const manifestContent = buildManifest(entries);
			const indexPath = path.join(changelogDir, "INDEX.md");
			const manifestPath = path.join(changelogDir, "manifest.json");
			if (args["dry-run"]) {
				process.stdout.write(`[would write] INDEX.md (${entries.length} rows)\n`);
				process.stdout.write(`[would write] manifest.json (${entries.length} entries)\n`);
				return;
			}
			await fs.writeFile(indexPath, indexContent, "utf-8");
			await fs.writeFile(manifestPath, manifestContent, "utf-8");
			if (args.json) {
				process.stdout.write(JSON.stringify({
					written: [indexPath, manifestPath],
					count: entries.length
				}, null, 2) + "\n");
				return;
			}
			if (!args.quiet) process.stdout.write(import_picocolors$6.default.green("✓") + ` INDEX.md (${entries.length} ${entries.length === 1 ? "entry" : "entries"})\n`);
		}
	});
}));
//#endregion
//#region node_modules/fast-string-truncated-width/dist/utils.js
var getCodePointsLength, isFullWidth, isWideNotCJKTNotEmoji;
var init_utils = __esmMin((() => {
	getCodePointsLength = (() => {
		const SURROGATE_PAIR_RE = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
		return (input) => {
			let surrogatePairsNr = 0;
			SURROGATE_PAIR_RE.lastIndex = 0;
			while (SURROGATE_PAIR_RE.test(input)) surrogatePairsNr += 1;
			return input.length - surrogatePairsNr;
		};
	})();
	isFullWidth = (x) => {
		return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
	};
	isWideNotCJKTNotEmoji = (x) => {
		return x === 8987 || x === 9001 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12771 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 19903 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
	};
}));
//#endregion
//#region node_modules/fast-string-truncated-width/dist/index.js
var ANSI_RE, CONTROL_RE, CJKT_WIDE_RE, TAB_RE, EMOJI_RE, LATIN_RE, MODIFIER_RE, NO_TRUNCATION$1, getStringTruncatedWidth;
var init_dist$3 = __esmMin((() => {
	init_utils();
	ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\u001b\]8;[^;]*;.*?(?:\u0007|\u001b\u005c)/y;
	CONTROL_RE = /[\x00-\x08\x0A-\x1F\x7F-\x9F]{1,1000}/y;
	CJKT_WIDE_RE = /(?:(?![\uFF61-\uFF9F\uFF00-\uFFEF])[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Tangut}]){1,1000}/uy;
	TAB_RE = /\t{1,1000}/y;
	EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[\u{E0061}-\u{E007A}]{2}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,3}\u{E007F}|(?:\p{Emoji}\uFE0F\u20E3?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation})(?:\u200D(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F\u20E3?))*/uy;
	LATIN_RE = /(?:[\x20-\x7E\xA0-\xFF](?!\uFE0F)){1,1000}/y;
	MODIFIER_RE = /\p{M}+/gu;
	NO_TRUNCATION$1 = {
		limit: Infinity,
		ellipsis: ""
	};
	getStringTruncatedWidth = (input, truncationOptions = {}, widthOptions = {}) => {
		const LIMIT = truncationOptions.limit ?? Infinity;
		const ELLIPSIS = truncationOptions.ellipsis ?? "";
		const ELLIPSIS_WIDTH = truncationOptions?.ellipsisWidth ?? (ELLIPSIS ? getStringTruncatedWidth(ELLIPSIS, NO_TRUNCATION$1, widthOptions).width : 0);
		const ANSI_WIDTH = 0;
		const CONTROL_WIDTH = widthOptions.controlWidth ?? 0;
		const TAB_WIDTH = widthOptions.tabWidth ?? 8;
		const EMOJI_WIDTH = widthOptions.emojiWidth ?? 2;
		const FULL_WIDTH_WIDTH = 2;
		const REGULAR_WIDTH = widthOptions.regularWidth ?? 1;
		const WIDE_WIDTH = widthOptions.wideWidth ?? FULL_WIDTH_WIDTH;
		const PARSE_BLOCKS = [
			[LATIN_RE, REGULAR_WIDTH],
			[ANSI_RE, ANSI_WIDTH],
			[CONTROL_RE, CONTROL_WIDTH],
			[TAB_RE, TAB_WIDTH],
			[EMOJI_RE, EMOJI_WIDTH],
			[CJKT_WIDE_RE, WIDE_WIDTH]
		];
		let indexPrev = 0;
		let index = 0;
		let length = input.length;
		let lengthExtra = 0;
		let truncationEnabled = false;
		let truncationIndex = length;
		let truncationLimit = Math.max(0, LIMIT - ELLIPSIS_WIDTH);
		let unmatchedStart = 0;
		let unmatchedEnd = 0;
		let width = 0;
		let widthExtra = 0;
		outer: while (true) {
			if (unmatchedEnd > unmatchedStart || index >= length && index > indexPrev) {
				const unmatched = input.slice(unmatchedStart, unmatchedEnd) || input.slice(indexPrev, index);
				lengthExtra = 0;
				for (const char of unmatched.replaceAll(MODIFIER_RE, "")) {
					const codePoint = char.codePointAt(0) || 0;
					if (isFullWidth(codePoint)) widthExtra = FULL_WIDTH_WIDTH;
					else if (isWideNotCJKTNotEmoji(codePoint)) widthExtra = WIDE_WIDTH;
					else widthExtra = REGULAR_WIDTH;
					if (width + widthExtra > truncationLimit) truncationIndex = Math.min(truncationIndex, Math.max(unmatchedStart, indexPrev) + lengthExtra);
					if (width + widthExtra > LIMIT) {
						truncationEnabled = true;
						break outer;
					}
					lengthExtra += char.length;
					width += widthExtra;
				}
				unmatchedStart = unmatchedEnd = 0;
			}
			if (index >= length) break outer;
			for (let i = 0, l = PARSE_BLOCKS.length; i < l; i++) {
				const [BLOCK_RE, BLOCK_WIDTH] = PARSE_BLOCKS[i];
				BLOCK_RE.lastIndex = index;
				if (BLOCK_RE.test(input)) {
					lengthExtra = BLOCK_RE === CJKT_WIDE_RE ? getCodePointsLength(input.slice(index, BLOCK_RE.lastIndex)) : BLOCK_RE === EMOJI_RE ? 1 : BLOCK_RE.lastIndex - index;
					widthExtra = lengthExtra * BLOCK_WIDTH;
					if (width + widthExtra > truncationLimit) truncationIndex = Math.min(truncationIndex, index + Math.floor((truncationLimit - width) / BLOCK_WIDTH));
					if (width + widthExtra > LIMIT) {
						truncationEnabled = true;
						break outer;
					}
					width += widthExtra;
					unmatchedStart = indexPrev;
					unmatchedEnd = index;
					index = indexPrev = BLOCK_RE.lastIndex;
					continue outer;
				}
			}
			index += 1;
		}
		return {
			width: truncationEnabled ? truncationLimit : width,
			index: truncationEnabled ? truncationIndex : length,
			truncated: truncationEnabled,
			ellipsed: truncationEnabled && LIMIT >= ELLIPSIS_WIDTH
		};
	};
}));
//#endregion
//#region node_modules/fast-string-width/dist/index.js
var NO_TRUNCATION, fastStringWidth;
var init_dist$2 = __esmMin((() => {
	init_dist$3();
	NO_TRUNCATION = {
		limit: Infinity,
		ellipsis: "",
		ellipsisWidth: 0
	};
	fastStringWidth = (input, options = {}) => {
		return getStringTruncatedWidth(input, NO_TRUNCATION, options).width;
	};
}));
//#endregion
//#region node_modules/fast-wrap-ansi/lib/main.js
function wrapAnsi(string, columns, options) {
	return String(string).normalize().split(CRLF_OR_LF).map((line) => exec(line, columns, options)).join("\n");
}
var ESC, CSI, END_CODE, ANSI_ESCAPE_BELL, ANSI_CSI, ANSI_OSC, ANSI_SGR_TERMINATOR, ANSI_ESCAPE_LINK, GROUP_REGEX, getClosingCode, wrapAnsiCode, wrapAnsiHyperlink, wrapWord, stringVisibleTrimSpacesRight, exec, CRLF_OR_LF;
var init_main = __esmMin((() => {
	init_dist$2();
	ESC = "\x1B";
	CSI = "";
	END_CODE = 39;
	ANSI_ESCAPE_BELL = "\x07";
	ANSI_CSI = "[";
	ANSI_OSC = "]";
	ANSI_SGR_TERMINATOR = "m";
	ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`;
	GROUP_REGEX = new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`, "y");
	getClosingCode = (openingCode) => {
		if (openingCode >= 30 && openingCode <= 37) return 39;
		if (openingCode >= 90 && openingCode <= 97) return 39;
		if (openingCode >= 40 && openingCode <= 47) return 49;
		if (openingCode >= 100 && openingCode <= 107) return 49;
		if (openingCode === 1 || openingCode === 2) return 22;
		if (openingCode === 3) return 23;
		if (openingCode === 4) return 24;
		if (openingCode === 7) return 27;
		if (openingCode === 8) return 28;
		if (openingCode === 9) return 29;
		if (openingCode === 0) return 0;
	};
	wrapAnsiCode = (code) => `${ESC}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`;
	wrapAnsiHyperlink = (url) => `${ESC}${ANSI_ESCAPE_LINK}${url}${ANSI_ESCAPE_BELL}`;
	wrapWord = (rows, word, columns) => {
		const characters = word[Symbol.iterator]();
		let isInsideEscape = false;
		let isInsideLinkEscape = false;
		let lastRow = rows.at(-1);
		let visible = lastRow === void 0 ? 0 : fastStringWidth(lastRow);
		let currentCharacter = characters.next();
		let nextCharacter = characters.next();
		let rawCharacterIndex = 0;
		while (!currentCharacter.done) {
			const character = currentCharacter.value;
			const characterLength = fastStringWidth(character);
			if (visible + characterLength <= columns) rows[rows.length - 1] += character;
			else {
				rows.push(character);
				visible = 0;
			}
			if (character === ESC || character === CSI) {
				isInsideEscape = true;
				isInsideLinkEscape = word.startsWith(ANSI_ESCAPE_LINK, rawCharacterIndex + 1);
			}
			if (isInsideEscape) {
				if (isInsideLinkEscape) {
					if (character === ANSI_ESCAPE_BELL) {
						isInsideEscape = false;
						isInsideLinkEscape = false;
					}
				} else if (character === ANSI_SGR_TERMINATOR) isInsideEscape = false;
			} else {
				visible += characterLength;
				if (visible === columns && !nextCharacter.done) {
					rows.push("");
					visible = 0;
				}
			}
			currentCharacter = nextCharacter;
			nextCharacter = characters.next();
			rawCharacterIndex += character.length;
		}
		lastRow = rows.at(-1);
		if (!visible && lastRow !== void 0 && lastRow.length && rows.length > 1) rows[rows.length - 2] += rows.pop();
	};
	stringVisibleTrimSpacesRight = (string) => {
		const words = string.split(" ");
		let last = words.length;
		while (last) {
			if (fastStringWidth(words[last - 1])) break;
			last--;
		}
		if (last === words.length) return string;
		return words.slice(0, last).join(" ") + words.slice(last).join("");
	};
	exec = (string, columns, options = {}) => {
		if (options.trim !== false && string.trim() === "") return "";
		let returnValue = "";
		let escapeCode;
		let escapeUrl;
		const words = string.split(" ");
		let rows = [""];
		let rowLength = 0;
		for (let index = 0; index < words.length; index++) {
			const word = words[index];
			if (options.trim !== false) {
				const row = rows.at(-1) ?? "";
				const trimmed = row.trimStart();
				if (row.length !== trimmed.length) {
					rows[rows.length - 1] = trimmed;
					rowLength = fastStringWidth(trimmed);
				}
			}
			if (index !== 0) {
				if (rowLength >= columns && (options.wordWrap === false || options.trim === false)) {
					rows.push("");
					rowLength = 0;
				}
				if (rowLength || options.trim === false) {
					rows[rows.length - 1] += " ";
					rowLength++;
				}
			}
			const wordLength = fastStringWidth(word);
			if (options.hard && wordLength > columns) {
				const remainingColumns = columns - rowLength;
				const breaksStartingThisLine = 1 + Math.floor((wordLength - remainingColumns - 1) / columns);
				if (Math.floor((wordLength - 1) / columns) < breaksStartingThisLine) rows.push("");
				wrapWord(rows, word, columns);
				rowLength = fastStringWidth(rows.at(-1) ?? "");
				continue;
			}
			if (rowLength + wordLength > columns && rowLength && wordLength) {
				if (options.wordWrap === false && rowLength < columns) {
					wrapWord(rows, word, columns);
					rowLength = fastStringWidth(rows.at(-1) ?? "");
					continue;
				}
				rows.push("");
				rowLength = 0;
			}
			if (rowLength + wordLength > columns && options.wordWrap === false) {
				wrapWord(rows, word, columns);
				rowLength = fastStringWidth(rows.at(-1) ?? "");
				continue;
			}
			rows[rows.length - 1] += word;
			rowLength += wordLength;
		}
		if (options.trim !== false) rows = rows.map((row) => stringVisibleTrimSpacesRight(row));
		const preString = rows.join("\n");
		let inSurrogate = false;
		for (let i = 0; i < preString.length; i++) {
			const character = preString[i];
			returnValue += character;
			if (!inSurrogate) {
				inSurrogate = character >= "\ud800" && character <= "\udbff";
				if (inSurrogate) continue;
			} else inSurrogate = false;
			if (character === ESC || character === CSI) {
				GROUP_REGEX.lastIndex = i + 1;
				const groups = GROUP_REGEX.exec(preString)?.groups;
				if (groups?.code !== void 0) {
					const code = Number.parseFloat(groups.code);
					escapeCode = code === END_CODE ? void 0 : code;
				} else if (groups?.uri !== void 0) escapeUrl = groups.uri.length === 0 ? void 0 : groups.uri;
			}
			if (preString[i + 1] === "\n") {
				if (escapeUrl) returnValue += wrapAnsiHyperlink("");
				const closingCode = escapeCode ? getClosingCode(escapeCode) : void 0;
				if (escapeCode && closingCode) returnValue += wrapAnsiCode(closingCode);
			} else if (character === "\n") {
				if (escapeCode && getClosingCode(escapeCode)) returnValue += wrapAnsiCode(escapeCode);
				if (escapeUrl) returnValue += wrapAnsiHyperlink(escapeUrl);
			}
		}
		return returnValue;
	};
	CRLF_OR_LF = /\r?\n/;
}));
//#endregion
//#region node_modules/sisteransi/src/index.js
var require_src = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const ESC = "\x1B";
	const CSI = `${ESC}[`;
	const beep = "\x07";
	const cursor = {
		to(x, y) {
			if (!y) return `${CSI}${x + 1}G`;
			return `${CSI}${y + 1};${x + 1}H`;
		},
		move(x, y) {
			let ret = "";
			if (x < 0) ret += `${CSI}${-x}D`;
			else if (x > 0) ret += `${CSI}${x}C`;
			if (y < 0) ret += `${CSI}${-y}A`;
			else if (y > 0) ret += `${CSI}${y}B`;
			return ret;
		},
		up: (count = 1) => `${CSI}${count}A`,
		down: (count = 1) => `${CSI}${count}B`,
		forward: (count = 1) => `${CSI}${count}C`,
		backward: (count = 1) => `${CSI}${count}D`,
		nextLine: (count = 1) => `${CSI}E`.repeat(count),
		prevLine: (count = 1) => `${CSI}F`.repeat(count),
		left: `${CSI}G`,
		hide: `${CSI}?25l`,
		show: `${CSI}?25h`,
		save: `${ESC}7`,
		restore: `${ESC}8`
	};
	module.exports = {
		cursor,
		scroll: {
			up: (count = 1) => `${CSI}S`.repeat(count),
			down: (count = 1) => `${CSI}T`.repeat(count)
		},
		erase: {
			screen: `${CSI}2J`,
			up: (count = 1) => `${CSI}1J`.repeat(count),
			down: (count = 1) => `${CSI}J`.repeat(count),
			line: `${CSI}2K`,
			lineEnd: `${CSI}K`,
			lineStart: `${CSI}1K`,
			lines(count) {
				let clear = "";
				for (let i = 0; i < count; i++) clear += this.line + (i < count - 1 ? cursor.up() : "");
				if (count) clear += cursor.left;
				return clear;
			}
		},
		beep
	};
}));
//#endregion
//#region node_modules/@clack/core/dist/index.mjs
function findCursor(s, o, l) {
	if (!l.some((r) => !r.disabled)) return s;
	const t = s + o, n = Math.max(l.length - 1, 0), e = t < 0 ? n : t > n ? 0 : t;
	return l[e]?.disabled ? findCursor(e, o < 0 ? -1 : 1, l) : e;
}
function findTextCursor(s, o, l, i) {
	const t = i.split(`
`);
	let n = 0, e = s;
	for (const r of t) {
		if (e <= r.length) break;
		e -= r.length + 1, n++;
	}
	for (n = Math.max(0, Math.min(t.length - 1, n + l)), e = Math.min(e, t[n].length) + o; e < 0 && n > 0;) n--, e += t[n].length + 1;
	for (; e > t[n].length && n < t.length - 1;) e -= t[n].length + 1, n++;
	e = Math.max(0, Math.min(t[n].length, e));
	let h = 0;
	for (let r = 0; r < n; r++) h += t[r].length + 1;
	return h + e;
}
function updateSettings(n) {
	if (n.aliases !== void 0) {
		const e = n.aliases;
		for (const s in e) {
			if (!Object.hasOwn(e, s)) continue;
			const i = e[s];
			i === void 0 || !settings.actions.has(i) || settings.aliases.has(s) || settings.aliases.set(s, i);
		}
	}
	if (n.messages !== void 0) {
		const e = n.messages;
		e.cancel !== void 0 && (settings.messages.cancel = e.cancel), e.error !== void 0 && (settings.messages.error = e.error);
	}
	if (n.withGuide !== void 0 && (settings.withGuide = n.withGuide !== false), n.date !== void 0) {
		const e = n.date;
		e.monthNames !== void 0 && (settings.date.monthNames = [...e.monthNames]), e.messages !== void 0 && (e.messages.required !== void 0 && (settings.date.messages.required = e.messages.required), e.messages.invalidMonth !== void 0 && (settings.date.messages.invalidMonth = e.messages.invalidMonth), e.messages.invalidDay !== void 0 && (settings.date.messages.invalidDay = e.messages.invalidDay), e.messages.afterMin !== void 0 && (settings.date.messages.afterMin = e.messages.afterMin), e.messages.beforeMax !== void 0 && (settings.date.messages.beforeMax = e.messages.beforeMax));
	}
}
function isActionKey(n, e) {
	if (typeof n == "string") return settings.aliases.get(n) === e;
	for (const s of n) if (s !== void 0 && isActionKey(s, e)) return true;
	return false;
}
function diffLines(i, s) {
	if (i === s) return;
	const e = i.split(`
`), t = s.split(`
`), r = Math.max(e.length, t.length), f = [];
	for (let n = 0; n < r; n++) e[n] !== t[n] && f.push(n);
	return {
		lines: f,
		numLinesBefore: e.length,
		numLinesAfter: t.length,
		numLines: r
	};
}
function isCancel(e) {
	return e === CANCEL_SYMBOL;
}
function setRawMode(e, r) {
	const o = e;
	o.isTTY && o.setRawMode(r);
}
function block({ input: e = stdin, output: r = stdout, overwrite: o = true, hideCursor: t = true } = {}) {
	const s = l.createInterface({
		input: e,
		output: r,
		prompt: "",
		tabSize: 1
	});
	l.emitKeypressEvents(e, s), e instanceof ReadStream && e.isTTY && e.setRawMode(true);
	const n = (f, { name: a, sequence: p }) => {
		if (isActionKey([
			String(f),
			a,
			p
		], "cancel")) {
			t && r.write(import_src$1.cursor.show), process.exit(0);
			return;
		}
		if (!o) return;
		const i = a === "return" ? 0 : -1, m = a === "return" ? -1 : 0;
		l.moveCursor(r, i, m, () => {
			l.clearLine(r, 1, () => {
				e.once("keypress", n);
			});
		});
	};
	return t && r.write(import_src$1.cursor.hide), e.once("keypress", n), () => {
		e.off("keypress", n), t && r.write(import_src$1.cursor.show), e instanceof ReadStream && e.isTTY && !R && e.setRawMode(false), s.terminal = false, s.close();
	};
}
function wrapTextWithPrefix(e, r, o, t = o, s = o, n) {
	return wrapAnsi(r, getColumns(e ?? stdout) - o.length, {
		hard: true,
		trim: false
	}).split(`
`).map((c, i, m) => {
		const d = n ? n(c, i) : c;
		return i === 0 ? `${t}${d}` : i === m.length - 1 ? `${s}${d}` : `${o}${d}`;
	}).join(`
`);
}
function runValidation(e, n) {
	if ("~standard" in e) {
		const a = e["~standard"].validate(n);
		if (a instanceof Promise) throw new TypeError("Schema validation must be synchronous. Update `validate()` and remove any asynchronous logic.");
		return a.issues?.at(0)?.message;
	}
	return e(n);
}
function p$1(l, e) {
	if (l === void 0 || e.length === 0) return 0;
	const i = e.findIndex((s) => s.value === l);
	return i !== -1 ? i : 0;
}
function g(l, e) {
	return (e.label ?? String(e.value)).toLowerCase().includes(l.toLowerCase());
}
function m$1(l, e) {
	if (e) return l ? e : e[0];
}
function M(r) {
	return [...r].map((t) => _[t]);
}
function P$1(r) {
	const i = new Intl.DateTimeFormat(r, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).formatToParts(new Date(2e3, 0, 15)), s = [];
	let n = "/";
	for (const e of i) e.type === "literal" ? n = e.value.trim() || e.value : (e.type === "year" || e.type === "month" || e.type === "day") && s.push({
		type: e.type,
		len: e.type === "year" ? 4 : 2
	});
	return {
		segments: s,
		separator: n
	};
}
function p$2(r) {
	return Number.parseInt((r || "0").replace(/_/g, "0"), 10) || 0;
}
function f(r) {
	return {
		year: p$2(r.year),
		month: p$2(r.month),
		day: p$2(r.day)
	};
}
function c$1(r, t) {
	return new Date(r || 2001, t || 1, 0).getDate();
}
function b$1(r) {
	const { year: t, month: i, day: s } = f(r);
	if (!t || t < 0 || t > 9999 || !i || i < 1 || i > 12 || !s || s < 1) return;
	const n = new Date(Date.UTC(t, i - 1, s));
	if (!(n.getUTCFullYear() !== t || n.getUTCMonth() !== i - 1 || n.getUTCDate() !== s)) return {
		year: t,
		month: i,
		day: s
	};
}
function C$1(r) {
	const t = b$1(r);
	return t ? new Date(Date.UTC(t.year, t.month - 1, t.day)) : void 0;
}
function T(r, t, i, s) {
	const n = i ? {
		year: i.getUTCFullYear(),
		month: i.getUTCMonth() + 1,
		day: i.getUTCDate()
	} : null, e = s ? {
		year: s.getUTCFullYear(),
		month: s.getUTCMonth() + 1,
		day: s.getUTCDate()
	} : null;
	return r === "year" ? {
		min: n?.year ?? 1,
		max: e?.year ?? 9999
	} : r === "month" ? {
		min: n && t.year === n.year ? n.month : 1,
		max: e && t.year === e.year ? e.month : 12
	} : {
		min: n && t.year === n.year && t.month === n.month ? n.day : 1,
		max: e && t.year === e.year && t.month === e.month ? e.day : c$1(t.year, t.month)
	};
}
var import_src$1, settings, R, CANCEL_SYMBOL, getColumns, getRows, V, T$1, r, _, U, u$2, o, h, a, u$1, n$1, u$3, n;
var init_dist$1 = __esmMin((() => {
	init_main();
	import_src$1 = require_src();
	settings = {
		actions: new Set([
			"up",
			"down",
			"left",
			"right",
			"space",
			"enter",
			"cancel"
		]),
		aliases: /* @__PURE__ */ new Map([
			["k", "up"],
			["j", "down"],
			["h", "left"],
			["l", "right"],
			["", "cancel"],
			["escape", "cancel"]
		]),
		messages: {
			cancel: "Canceled",
			error: "Something went wrong"
		},
		withGuide: true,
		date: {
			monthNames: [...[
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December"
			]],
			messages: {
				required: "Please enter a valid date",
				invalidMonth: "There are only 12 months in a year",
				invalidDay: (n, e) => `There are only ${n} days in ${e}`,
				afterMin: (n) => `Date must be on or after ${n.toISOString().slice(0, 10)}`,
				beforeMax: (n) => `Date must be on or before ${n.toISOString().slice(0, 10)}`
			}
		}
	};
	R = globalThis.process.platform.startsWith("win");
	CANCEL_SYMBOL = Symbol("clack:cancel");
	getColumns = (e) => "columns" in e && typeof e.columns == "number" ? e.columns : 80, getRows = (e) => "rows" in e && typeof e.rows == "number" ? e.rows : 20;
	V = class {
		input;
		output;
		_abortSignal;
		rl;
		opts;
		_render;
		_track = false;
		_prevFrame = "";
		_subscribers = /* @__PURE__ */ new Map();
		_cursor = 0;
		state = "initial";
		error = "";
		value;
		userInput = "";
		constructor(t, e = true) {
			const { input: i = stdin, output: n = stdout, render: s, signal: r, ...o } = t;
			this.opts = o, this.onKeypress = this.onKeypress.bind(this), this.close = this.close.bind(this), this.render = this.render.bind(this), this._render = s.bind(this), this._track = e, this._abortSignal = r, this.input = i, this.output = n;
		}
		/**
		* Unsubscribe all listeners
		*/
		unsubscribe() {
			this._subscribers.clear();
		}
		/**
		* Set a subscriber with opts
		* @param event - The event name
		*/
		setSubscriber(t, e) {
			const i = this._subscribers.get(t) ?? [];
			i.push(e), this._subscribers.set(t, i);
		}
		/**
		* Subscribe to an event
		* @param event - The event name
		* @param cb - The callback
		*/
		on(t, e) {
			this.setSubscriber(t, { cb: e });
		}
		/**
		* Subscribe to an event once
		* @param event - The event name
		* @param cb - The callback
		*/
		once(t, e) {
			this.setSubscriber(t, {
				cb: e,
				once: true
			});
		}
		/**
		* Emit an event with data
		* @param event - The event name
		* @param data - The data to pass to the callback
		*/
		emit(t, ...e) {
			const i = this._subscribers.get(t) ?? [], n = [];
			for (const s of i) s.cb(...e), s.once && n.push(() => i.splice(i.indexOf(s), 1));
			for (const s of n) s();
		}
		prompt() {
			return new Promise((t) => {
				if (this._abortSignal) {
					if (this._abortSignal.aborted) return this.state = "cancel", this.close(), t(CANCEL_SYMBOL);
					this._abortSignal.addEventListener("abort", () => {
						this.state = "cancel", this.close();
					}, { once: true });
				}
				this.rl = l__default.createInterface({
					input: this.input,
					tabSize: 2,
					prompt: "",
					escapeCodeTimeout: 50,
					terminal: true
				}), this.rl.prompt(), this.opts.initialUserInput !== void 0 && this._setUserInput(this.opts.initialUserInput, true), this.input.on("keypress", this.onKeypress), setRawMode(this.input, true), this.output.on("resize", this.render), this.render(), this.once("submit", () => {
					this.output.write(import_src$1.cursor.show), this.output.off("resize", this.render), setRawMode(this.input, false), t(this.value);
				}), this.once("cancel", () => {
					this.output.write(import_src$1.cursor.show), this.output.off("resize", this.render), setRawMode(this.input, false), t(CANCEL_SYMBOL);
				});
			});
		}
		_isActionKey(t, e) {
			return t === "	";
		}
		_shouldSubmit(t, e) {
			return true;
		}
		_setValue(t) {
			this.value = t, this.emit("value", this.value);
		}
		_setUserInput(t, e) {
			this.userInput = t ?? "", this.emit("userInput", this.userInput), e && this._track && this.rl && (this.rl.write(this.userInput), this._cursor = this.rl.cursor);
		}
		_clearUserInput() {
			this.rl?.write(null, {
				ctrl: true,
				name: "u"
			}), this._setUserInput("");
		}
		onKeypress(t, e) {
			if (this._track && e.name !== "return" && (e.name && this._isActionKey(t, e) && this.rl?.write(null, {
				ctrl: true,
				name: "h"
			}), this._cursor = this.rl?.cursor ?? 0, this._setUserInput(this.rl?.line)), this.state === "error" && (this.state = "active"), e?.name && (!this._track && settings.aliases.has(e.name) && this.emit("cursor", settings.aliases.get(e.name)), settings.actions.has(e.name) && this.emit("cursor", e.name)), t && (t.toLowerCase() === "y" || t.toLowerCase() === "n") && this.emit("confirm", t.toLowerCase() === "y"), this.emit("key", t, e), e?.name === "return" && this._shouldSubmit(t, e)) {
				if (this.opts.validate) {
					const i = runValidation(this.opts.validate, this.value);
					i && (this.error = i instanceof Error ? i.message : i, this.state = "error", this.rl?.write(this.userInput));
				}
				this.state !== "error" && (this.state = "submit");
			}
			isActionKey([
				t,
				e?.name,
				e?.sequence
			], "cancel") && (this.state = "cancel"), (this.state === "submit" || this.state === "cancel") && this.emit("finalize"), this.render(), (this.state === "submit" || this.state === "cancel") && this.close();
		}
		close() {
			this.input.unpipe(), this.input.removeListener("keypress", this.onKeypress), this.output.write(`
`), setRawMode(this.input, false), this.rl?.close(), this.rl = void 0, this.emit(`${this.state}`, this.value), this.unsubscribe();
		}
		restoreCursor() {
			const t = wrapAnsi(this._prevFrame, process.stdout.columns, {
				hard: true,
				trim: false
			}).split(`
`).length - 1;
			this.output.write(import_src$1.cursor.move(-999, t * -1));
		}
		render() {
			const t = wrapAnsi(this._render(this) ?? "", process.stdout.columns, {
				hard: true,
				trim: false
			});
			if (t !== this._prevFrame) {
				if (this.state === "initial") this.output.write(import_src$1.cursor.hide);
				else {
					const e = diffLines(this._prevFrame, t), i = getRows(this.output);
					if (this.restoreCursor(), e) {
						const n = Math.max(0, e.numLinesAfter - i), s = Math.max(0, e.numLinesBefore - i);
						let r = e.lines.find((o) => o >= n);
						if (r === void 0) {
							this._prevFrame = t;
							return;
						}
						if (e.lines.length === 1) {
							this.output.write(import_src$1.cursor.move(0, r - s)), this.output.write(import_src$1.erase.lines(1));
							const o = t.split(`
`);
							this.output.write(o[r]), this._prevFrame = t, this.output.write(import_src$1.cursor.move(0, o.length - r - 1));
							return;
						} else if (e.lines.length > 1) {
							if (n < s) r = n;
							else {
								const h = r - s;
								h > 0 && this.output.write(import_src$1.cursor.move(0, h));
							}
							this.output.write(import_src$1.erase.down());
							const f = t.split(`
`).slice(r);
							this.output.write(f.join(`
`)), this._prevFrame = t;
							return;
						}
					}
					this.output.write(import_src$1.erase.down());
				}
				this.output.write(t), this.state === "initial" && (this.state = "active"), this._prevFrame = t;
			}
		}
	};
	T$1 = class T extends V {
		filteredOptions;
		multiple;
		isNavigating = false;
		selectedValues = [];
		focusedValue;
		#e = 0;
		#s = "";
		#t;
		#i;
		#n;
		get cursor() {
			return this.#e;
		}
		get userInputWithCursor() {
			if (!this.userInput) return styleText(["inverse", "hidden"], "_");
			if (this._cursor >= this.userInput.length) return `${this.userInput}\u2588`;
			const e = this.userInput.slice(0, this.cursor), t = this.userInput.slice(this.cursor, this.cursor + 1), i = this.userInput.slice(this.cursor + 1);
			return `${e}${styleText("inverse", t)}${i}`;
		}
		get options() {
			return typeof this.#i == "function" ? this.#i() : this.#i;
		}
		constructor(e) {
			super(e), this.#i = e.options, this.#n = e.placeholder;
			const t = this.options;
			this.filteredOptions = [...t], this.multiple = e.multiple === true, this.#t = typeof e.options == "function" ? e.filter : e.filter ?? g;
			let i;
			if (e.initialValue && Array.isArray(e.initialValue) ? this.multiple ? i = e.initialValue : i = e.initialValue.slice(0, 1) : !this.multiple && this.options.length > 0 && (i = [this.options[0]?.value]), i) for (const s of i) {
				const n = t.findIndex((o) => o.value === s);
				n !== -1 && (this.toggleSelected(s), this.#e = n);
			}
			this.focusedValue = this.options[this.#e]?.value, this.on("key", (s, n) => this.#l(s, n)), this.on("userInput", (s) => this.#u(s));
		}
		_isActionKey(e, t) {
			return e === "	" || this.multiple && this.isNavigating && t.name === "space" && e !== void 0 && e !== "";
		}
		#l(e, t) {
			const i = t.name === "up", s = t.name === "down", n = t.name === "return", o = this.userInput === "" || this.userInput === "	", u = this.#n, a = this.options, f = u !== void 0 && u !== "" && a.some((r) => !r.disabled && (this.#t ? this.#t(u, r) : true));
			if (t.name === "tab" && o && f) {
				this.userInput === "	" && this._clearUserInput(), this._setUserInput(u, true), this.isNavigating = false;
				return;
			}
			i || s ? (this.#e = findCursor(this.#e, i ? -1 : 1, this.filteredOptions), this.focusedValue = this.filteredOptions[this.#e]?.value, this.multiple || (this.selectedValues = [this.focusedValue]), this.isNavigating = true) : n ? this.value = m$1(this.multiple, this.selectedValues) : this.multiple ? this.focusedValue !== void 0 && (t.name === "tab" || this.isNavigating && t.name === "space") ? this.toggleSelected(this.focusedValue) : this.isNavigating = false : (this.focusedValue && (this.selectedValues = [this.focusedValue]), this.isNavigating = false);
		}
		deselectAll() {
			this.selectedValues = [];
		}
		toggleSelected(e) {
			this.filteredOptions.length !== 0 && (this.multiple ? this.selectedValues.includes(e) ? this.selectedValues = this.selectedValues.filter((t) => t !== e) : this.selectedValues = [...this.selectedValues, e] : this.selectedValues = [e]);
		}
		#u(e) {
			if (e !== this.#s) {
				this.#s = e;
				const t = this.options;
				e && this.#t ? this.filteredOptions = t.filter((n) => this.#t?.(e, n)) : this.filteredOptions = [...t];
				const i = p$1(this.focusedValue, this.filteredOptions);
				this.#e = findCursor(i, 0, this.filteredOptions);
				const s = this.filteredOptions[this.#e];
				s && !s.disabled ? this.focusedValue = s.value : this.focusedValue = void 0, this.multiple || (this.focusedValue !== void 0 ? this.toggleSelected(this.focusedValue) : this.deselectAll());
			}
		}
	};
	r = class extends V {
		get cursor() {
			return this.value ? 0 : 1;
		}
		get _value() {
			return this.cursor === 0;
		}
		constructor(t) {
			super(t, false), this.value = !!t.initialValue, this.on("userInput", () => {
				this.value = this._value;
			}), this.on("confirm", (i) => {
				this.output.write(import_src$1.cursor.move(0, -1)), this.value = i, this.state = "submit", this.close();
			}), this.on("cursor", () => {
				this.value = !this.value;
			});
		}
	};
	_ = {
		Y: {
			type: "year",
			len: 4
		},
		M: {
			type: "month",
			len: 2
		},
		D: {
			type: "day",
			len: 2
		}
	};
	U = class extends V {
		#i;
		#o;
		#t;
		#h;
		#u;
		#e = {
			segmentIndex: 0,
			positionInSegment: 0
		};
		#n = true;
		#s = null;
		inlineError = "";
		get segmentCursor() {
			return { ...this.#e };
		}
		get segmentValues() {
			return { ...this.#t };
		}
		get segments() {
			return this.#i;
		}
		get separator() {
			return this.#o;
		}
		get formattedValue() {
			return this.#l(this.#t);
		}
		#l(t) {
			return this.#i.map((i) => t[i.type]).join(this.#o);
		}
		#r() {
			this._setUserInput(this.#l(this.#t)), this._setValue(C$1(this.#t) ?? void 0);
		}
		constructor(t) {
			const i = t.format ? {
				segments: M(t.format),
				separator: t.separator ?? "/"
			} : P$1(t.locale), s = t.separator ?? i.separator, n = t.format ? M(t.format) : i.segments, e = t.initialValue ?? t.defaultValue, m = e ? {
				year: String(e.getUTCFullYear()).padStart(4, "0"),
				month: String(e.getUTCMonth() + 1).padStart(2, "0"),
				day: String(e.getUTCDate()).padStart(2, "0")
			} : {
				year: "____",
				month: "__",
				day: "__"
			}, o = n.map((a) => m[a.type]).join(s);
			super({
				...t,
				initialUserInput: o
			}, false), this.#i = n, this.#o = s, this.#t = m, this.#h = t.minDate, this.#u = t.maxDate, this.#r(), this.on("cursor", (a) => this.#f(a)), this.on("key", (a, u) => this.#y(a, u)), this.on("finalize", () => this.#p(t));
		}
		#a() {
			const t = Math.max(0, Math.min(this.#e.segmentIndex, this.#i.length - 1)), i = this.#i[t];
			if (i) return this.#e.positionInSegment = Math.max(0, Math.min(this.#e.positionInSegment, i.len - 1)), {
				segment: i,
				index: t
			};
		}
		#m(t) {
			this.inlineError = "", this.#s = null;
			const i = this.#a();
			i && (this.#e.segmentIndex = Math.max(0, Math.min(this.#i.length - 1, i.index + t)), this.#e.positionInSegment = 0, this.#n = true);
		}
		#d(t) {
			const i = this.#a();
			if (!i) return;
			const { segment: s } = i, n = this.#t[s.type], e = !n || n.replace(/_/g, "") === "", m = Number.parseInt((n || "0").replace(/_/g, "0"), 10) || 0, o = T(s.type, f(this.#t), this.#h, this.#u);
			let a;
			e ? a = t === 1 ? o.min : o.max : a = Math.max(Math.min(o.max, m + t), o.min), this.#t = {
				...this.#t,
				[s.type]: a.toString().padStart(s.len, "0")
			}, this.#n = true, this.#s = null, this.#r();
		}
		#f(t) {
			if (t) switch (t) {
				case "right": return this.#m(1);
				case "left": return this.#m(-1);
				case "up": return this.#d(1);
				case "down": return this.#d(-1);
			}
		}
		#y(t, i) {
			if (i?.name === "backspace" || i?.sequence === "" || i?.sequence === "\b" || t === "" || t === "\b") {
				this.inlineError = "";
				const n = this.#a();
				if (!n) return;
				if (!this.#t[n.segment.type].replace(/_/g, "")) {
					this.#m(-1);
					return;
				}
				this.#t[n.segment.type] = "_".repeat(n.segment.len), this.#n = true, this.#e.positionInSegment = 0, this.#r();
				return;
			}
			if (i?.name === "tab") {
				this.inlineError = "";
				const n = this.#a();
				if (!n) return;
				const e = i.shift ? -1 : 1, m = n.index + e;
				m >= 0 && m < this.#i.length && (this.#e.segmentIndex = m, this.#e.positionInSegment = 0, this.#n = true);
				return;
			}
			if (t && /^[0-9]$/.test(t)) {
				const n = this.#a();
				if (!n) return;
				const { segment: e } = n, m = !this.#t[e.type].replace(/_/g, "");
				if (this.#n && this.#s !== null && !m) {
					const h = this.#s + t, d = {
						...this.#t,
						[e.type]: h
					}, g = this.#g(d, e);
					if (g) {
						this.inlineError = g, this.#s = null, this.#n = false;
						return;
					}
					this.inlineError = "", this.#t[e.type] = h, this.#s = null, this.#n = false, this.#r(), n.index < this.#i.length - 1 && (this.#e.segmentIndex = n.index + 1, this.#e.positionInSegment = 0, this.#n = true);
					return;
				}
				this.#n && !m && (this.#t[e.type] = "_".repeat(e.len), this.#e.positionInSegment = 0), this.#n = false, this.#s = null;
				const o = this.#t[e.type], a = o.indexOf("_"), u = a >= 0 ? a : Math.min(this.#e.positionInSegment, e.len - 1);
				if (u < 0 || u >= e.len) return;
				let l = o.slice(0, u) + t + o.slice(u + 1), D = false;
				if (u === 0 && o === "__" && (e.type === "month" || e.type === "day")) {
					const h = Number.parseInt(t, 10);
					l = `0${t}`, D = h <= (e.type === "month" ? 1 : 2);
				}
				if (e.type === "year" && (l = (o.replace(/_/g, "") + t).padStart(e.len, "_")), !l.includes("_")) {
					const h = {
						...this.#t,
						[e.type]: l
					}, d = this.#g(h, e);
					if (d) {
						this.inlineError = d;
						return;
					}
				}
				this.inlineError = "", this.#t[e.type] = l;
				const y = l.includes("_") ? void 0 : b$1(this.#t);
				if (y) {
					const { year: h, month: d } = y, g = c$1(h, d);
					this.#t = {
						year: String(Math.max(0, Math.min(9999, h))).padStart(4, "0"),
						month: String(Math.max(1, Math.min(12, d))).padStart(2, "0"),
						day: String(Math.max(1, Math.min(g, y.day))).padStart(2, "0")
					};
				}
				this.#r();
				const S = l.indexOf("_");
				D ? (this.#n = true, this.#s = t) : S >= 0 ? this.#e.positionInSegment = S : a >= 0 && n.index < this.#i.length - 1 ? (this.#e.segmentIndex = n.index + 1, this.#e.positionInSegment = 0, this.#n = true) : this.#e.positionInSegment = Math.min(u + 1, e.len - 1);
			}
		}
		#g(t, i) {
			const { month: s, day: n } = f(t);
			if (i.type === "month" && (s < 0 || s > 12)) return settings.date.messages.invalidMonth;
			if (i.type === "day" && (n < 0 || n > 31)) return settings.date.messages.invalidDay(31, "any month");
		}
		#p(t) {
			const { year: i, month: s, day: n } = f(this.#t);
			if (i && s && n) {
				const e = c$1(i, s);
				this.#t = {
					...this.#t,
					day: String(Math.min(n, e)).padStart(2, "0")
				};
			}
			this.value = C$1(this.#t) ?? t.defaultValue ?? void 0;
		}
	};
	u$2 = class u extends V {
		options;
		cursor = 0;
		#t;
		getGroupItems(t) {
			return this.options.filter((r) => r.group === t);
		}
		isGroupSelected(t) {
			const r = this.getGroupItems(t), e = this.value;
			return e === void 0 ? false : r.every((s) => e.includes(s.value));
		}
		toggleValue() {
			const t = this.options[this.cursor];
			if (t !== void 0) if (this.value === void 0 && (this.value = []), t.group === true) {
				const r = t.value, e = this.getGroupItems(r);
				this.isGroupSelected(r) ? this.value = this.value.filter((s) => e.findIndex((i) => i.value === s) === -1) : this.value = [...this.value, ...e.map((s) => s.value)], this.value = Array.from(new Set(this.value));
			} else {
				const r = this.value.includes(t.value);
				this.value = r ? this.value.filter((e) => e !== t.value) : [...this.value, t.value];
			}
		}
		constructor(t) {
			super(t, false);
			const { options: r } = t;
			this.#t = t.selectableGroups !== false, this.options = Object.entries(r).flatMap(([e, s]) => [{
				value: e,
				group: true,
				label: e
			}, ...s.map((i) => ({
				...i,
				group: e
			}))]), this.value = [...t.initialValues ?? []], this.cursor = Math.max(this.options.findIndex(({ value: e }) => e === t.cursorAt), this.#t ? 0 : 1), this.on("cursor", (e) => {
				switch (e) {
					case "left":
					case "up": {
						this.cursor = this.cursor === 0 ? this.options.length - 1 : this.cursor - 1;
						const s = this.options[this.cursor]?.group === true;
						!this.#t && s && (this.cursor = this.cursor === 0 ? this.options.length - 1 : this.cursor - 1);
						break;
					}
					case "down":
					case "right": {
						this.cursor = this.cursor === this.options.length - 1 ? 0 : this.cursor + 1;
						const s = this.options[this.cursor]?.group === true;
						!this.#t && s && (this.cursor = this.cursor === this.options.length - 1 ? 0 : this.cursor + 1);
						break;
					}
					case "space":
						this.toggleValue();
						break;
				}
			});
		}
	};
	o = /* @__PURE__ */ new Set([
		"up",
		"down",
		"left",
		"right"
	]);
	h = class extends V {
		#t = false;
		#s;
		focused = "editor";
		get userInputWithCursor() {
			if (this.state === "submit") return this.userInput;
			const t = this.userInput;
			if (this.cursor >= t.length) return `${t}\u2588`;
			const s = t.slice(0, this.cursor), r = t.slice(this.cursor, this.cursor + 1), i = t.slice(this.cursor + 1);
			return r === `
` ? `${s}\u2588
${i}` : `${s}${styleText("inverse", r)}${i}`;
		}
		get cursor() {
			return this._cursor;
		}
		#r(t) {
			if (this.userInput.length === 0) {
				this._setUserInput(t);
				return;
			}
			this._setUserInput(this.userInput.slice(0, this.cursor) + t + this.userInput.slice(this.cursor));
		}
		#i(t) {
			const s = this.value ?? "";
			switch (t) {
				case "up":
					this._cursor = findTextCursor(this._cursor, 0, -1, s);
					return;
				case "down":
					this._cursor = findTextCursor(this._cursor, 0, 1, s);
					return;
				case "left":
					this._cursor = findTextCursor(this._cursor, -1, 0, s);
					return;
				case "right":
					this._cursor = findTextCursor(this._cursor, 1, 0, s);
					return;
			}
		}
		_shouldSubmit(t, s) {
			if (this.#s) return this.focused === "submit" ? true : (this.#r(`
`), this._cursor++, false);
			const r = this.#t;
			return this.#t = true, r && this.cursor === this.userInput.length ? (this.userInput[this.cursor - 1] === `
` && (this._setUserInput(this.userInput.slice(0, this.cursor - 1) + this.userInput.slice(this.cursor)), this._cursor--), true) : (this.#r(`
`), this._cursor++, false);
		}
		constructor(t) {
			const s = t.initialUserInput ?? t.initialValue;
			super({
				...t,
				initialUserInput: s
			}, false), s !== void 0 && (this._cursor = s.length), this.#s = t.showSubmit ?? false, this.on("key", (r, i) => {
				if (i?.name && o.has(i.name)) {
					this.#t = false, this.#i(i.name);
					return;
				}
				if (r === "	" && this.#s) {
					this.focused = this.focused === "editor" ? "submit" : "editor";
					return;
				}
				if (i?.name !== "return") {
					if (this.#t = false, i?.name === "backspace" && this.cursor > 0) {
						this._setUserInput(this.userInput.slice(0, this.cursor - 1) + this.userInput.slice(this.cursor)), this._cursor--;
						return;
					}
					if (i?.name === "delete" && this.cursor < this.userInput.length) {
						this._setUserInput(this.userInput.slice(0, this.cursor) + this.userInput.slice(this.cursor + 1));
						return;
					}
					r && (this.#s && this.focused === "submit" && (this.focused = "editor"), this.#r(r ?? ""), this._cursor++);
				}
			}), this.on("userInput", (r) => {
				this._setValue(r);
			}), this.on("finalize", () => {
				this.value || (this.value = t.defaultValue), this.value === void 0 && (this.value = "");
			});
		}
	};
	a = class extends V {
		options;
		cursor = 0;
		get _value() {
			return this.options[this.cursor]?.value;
		}
		get _enabledOptions() {
			return this.options.filter((e) => e.disabled !== true);
		}
		toggleAll() {
			const e = this._enabledOptions, i = this.value !== void 0 && this.value.length === e.length;
			this.value = i ? [] : e.map((t) => t.value);
		}
		toggleInvert() {
			const e = this.value;
			if (!e) return;
			const i = this._enabledOptions.filter((t) => !e.includes(t.value));
			this.value = i.map((t) => t.value);
		}
		toggleValue() {
			this.value === void 0 && (this.value = []);
			const e = this.value.includes(this._value);
			this.value = e ? this.value.filter((i) => i !== this._value) : [...this.value, this._value];
		}
		constructor(e) {
			super(e, false), this.options = e.options, this.value = [...e.initialValues ?? []];
			const i = Math.max(this.options.findIndex(({ value: t }) => t === e.cursorAt), 0);
			this.cursor = this.options[i]?.disabled ? findCursor(i, 1, this.options) : i, this.on("key", (t, l) => {
				l.name === "a" && this.toggleAll(), l.name === "i" && this.toggleInvert();
			}), this.on("cursor", (t) => {
				switch (t) {
					case "left":
					case "up":
						this.cursor = findCursor(this.cursor, -1, this.options);
						break;
					case "down":
					case "right":
						this.cursor = findCursor(this.cursor, 1, this.options);
						break;
					case "space":
						this.toggleValue();
						break;
				}
			});
		}
	};
	u$1 = class u extends V {
		_mask = "•";
		get cursor() {
			return this._cursor;
		}
		get masked() {
			return this.userInput.replaceAll(/./g, this._mask);
		}
		get userInputWithCursor() {
			if (this.state === "submit" || this.state === "cancel") return this.masked;
			const t = this.userInput;
			if (this.cursor >= t.length) return `${this.masked}${styleText(["inverse", "hidden"], "_")}`;
			const s = this.masked, r = s.slice(0, this.cursor), i = s.slice(this.cursor, this.cursor + 1), o = s.slice(this.cursor + 1);
			return `${r}${styleText("inverse", i)}${o}`;
		}
		clear() {
			this._clearUserInput();
		}
		constructor({ mask: t, ...s }) {
			super(s), this._mask = t ?? "•", this.on("userInput", (r) => {
				this._setValue(r);
			}), this.on("finalize", () => {
				this.value === void 0 && (this.value = "");
			});
		}
	};
	n$1 = class n extends V {
		options;
		cursor = 0;
		get _selectedValue() {
			return this.options[this.cursor];
		}
		changeValue() {
			const e = this._selectedValue;
			this.value = e === void 0 ? void 0 : e.value;
		}
		constructor(e) {
			super(e, false), this.options = e.options;
			const o = this.options.findIndex(({ value: s }) => s === e.initialValue), t = o === -1 ? 0 : o;
			this.cursor = this.options[t]?.disabled ? findCursor(t, 1, this.options) : t, this.changeValue(), this.on("cursor", (s) => {
				switch (s) {
					case "left":
					case "up":
						this.cursor = findCursor(this.cursor, -1, this.options);
						break;
					case "down":
					case "right":
						this.cursor = findCursor(this.cursor, 1, this.options);
						break;
				}
				this.changeValue();
			});
		}
	};
	u$3 = class extends V {
		options;
		cursor = 0;
		constructor(t) {
			super(t, false), this.options = t.options;
			const s = t.caseSensitive === true, i = this.options.map(({ value: [e] }) => s ? e : e?.toLowerCase());
			this.cursor = Math.max(i.indexOf(t.initialValue), 0), this.on("key", (e) => {
				if (!e) return;
				const o = s ? e : e.toLowerCase();
				if (!i.includes(o)) return;
				const n = this.options.find(({ value: [r] }) => s ? r === o : r?.toLowerCase() === o);
				n && (this.value = n.value, this.state = "submit", this.emit("submit"));
			});
		}
	};
	n = class extends V {
		get userInputWithCursor() {
			if (this.state === "submit") return this.userInput;
			const t = this.userInput;
			if (this.cursor >= t.length) return `${this.userInput}\u2588`;
			const r = t.slice(0, this.cursor), s = t.slice(this.cursor, this.cursor + 1), e = t.slice(this.cursor + 1);
			return `${r}${styleText("inverse", s)}${e}`;
		}
		get cursor() {
			return this._cursor;
		}
		constructor(t) {
			super({
				...t,
				initialUserInput: t.initialUserInput ?? t.initialValue
			}), this.on("userInput", (r) => {
				this._setValue(r);
			}), this.on("finalize", () => {
				this.value || (this.value = t.defaultValue), this.value === void 0 && (this.value = "");
			});
		}
	};
}));
//#endregion
//#region node_modules/@clack/prompts/dist/index.mjs
var dist_exports = /* @__PURE__ */ __exportAll({
	MULTISELECT_INSTRUCTIONS: () => MULTISELECT_INSTRUCTIONS,
	SELECT_INSTRUCTIONS: () => SELECT_INSTRUCTIONS,
	S_BAR: () => S_BAR,
	S_BAR_END: () => S_BAR_END,
	S_BAR_END_RIGHT: () => S_BAR_END_RIGHT,
	S_BAR_H: () => S_BAR_H,
	S_BAR_START: () => S_BAR_START,
	S_BAR_START_RIGHT: () => S_BAR_START_RIGHT,
	S_CHECKBOX_ACTIVE: () => S_CHECKBOX_ACTIVE,
	S_CHECKBOX_INACTIVE: () => S_CHECKBOX_INACTIVE,
	S_CHECKBOX_SELECTED: () => S_CHECKBOX_SELECTED,
	S_CONNECT_LEFT: () => S_CONNECT_LEFT,
	S_CORNER_BOTTOM_LEFT: () => S_CORNER_BOTTOM_LEFT,
	S_CORNER_BOTTOM_RIGHT: () => S_CORNER_BOTTOM_RIGHT,
	S_CORNER_TOP_LEFT: () => S_CORNER_TOP_LEFT,
	S_CORNER_TOP_RIGHT: () => S_CORNER_TOP_RIGHT,
	S_ERROR: () => S_ERROR,
	S_INFO: () => S_INFO,
	S_PASSWORD_MASK: () => S_PASSWORD_MASK,
	S_RADIO_ACTIVE: () => S_RADIO_ACTIVE,
	S_RADIO_INACTIVE: () => S_RADIO_INACTIVE,
	S_STEP_ACTIVE: () => S_STEP_ACTIVE,
	S_STEP_CANCEL: () => S_STEP_CANCEL,
	S_STEP_ERROR: () => S_STEP_ERROR,
	S_STEP_SUBMIT: () => S_STEP_SUBMIT,
	S_SUCCESS: () => S_SUCCESS,
	S_WARN: () => S_WARN,
	autocomplete: () => autocomplete,
	autocompleteMultiselect: () => autocompleteMultiselect,
	box: () => box,
	cancel: () => cancel,
	confirm: () => confirm,
	date: () => date,
	formatInstructionFooter: () => formatInstructionFooter,
	group: () => group,
	groupMultiselect: () => groupMultiselect,
	intro: () => intro,
	isCI: () => isCI,
	isCancel: () => isCancel,
	isTTY: () => isTTY,
	limitOptions: () => limitOptions,
	log: () => log,
	multiline: () => multiline,
	multiselect: () => multiselect,
	note: () => note,
	outro: () => outro,
	password: () => password,
	path: () => path$1,
	progress: () => progress,
	select: () => select,
	selectKey: () => selectKey,
	settings: () => settings,
	spinner: () => spinner,
	stream: () => stream,
	symbol: () => symbol,
	symbolBar: () => symbolBar,
	taskLog: () => taskLog,
	tasks: () => tasks,
	text: () => text,
	unicode: () => unicode,
	unicodeOr: () => unicodeOr,
	updateSettings: () => updateSettings
});
function isUnicodeSupported() {
	if (process$1.platform !== "win32") return process$1.env.TERM !== "linux";
	return Boolean(process$1.env.CI) || Boolean(process$1.env.WT_SESSION) || Boolean(process$1.env.TERMINUS_SUBLIME) || process$1.env.ConEmuTask === "{cmd::Cmder}" || process$1.env.TERM_PROGRAM === "Terminus-Sublime" || process$1.env.TERM_PROGRAM === "vscode" || process$1.env.TERM === "xterm-256color" || process$1.env.TERM === "alacritty" || process$1.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
function formatInstructionFooter(o, e) {
	const r = [`${e ? `${styleText("cyan", S_BAR)}  ` : ""}${o.join(" • ")}`];
	return e && r.push(styleText("cyan", S_BAR_END)), r;
}
function P(t) {
	return t.label ?? String(t.value ?? "");
}
function E(t, c) {
	if (!t) return true;
	const n = (c.label ?? String(c.value ?? "")).toLowerCase(), i = (c.hint ?? "").toLowerCase(), l = String(c.value).toLowerCase(), o = t.toLowerCase();
	return n.includes(o) || i.includes(o) || l.includes(o);
}
function N(t, c) {
	const n = [];
	for (const i of c) t.includes(i.value) && n.push(i);
	return n;
}
function A$1(n, e, t, o) {
	let i = t, f = t;
	return o === "center" ? i = Math.floor((e - n) / 2) : o === "right" && (i = e - n - t), f = e - i - n, [i, f];
}
function b(e, r) {
	const t = e.segmentValues, o = e.segmentCursor;
	if (r === "submit" || r === "cancel") return e.formattedValue;
	const i = styleText("gray", e.separator);
	return e.segments.map((l, d) => {
		const c = d === o.segmentIndex && !["submit", "cancel"].includes(r), a = p[l.type];
		return x(t[l.type], {
			isActive: c,
			label: a
		});
	}).join(i);
}
function x(e, r) {
	const t = !e || e.replace(/_/g, "") === "";
	return r.isActive ? styleText("inverse", t ? r.label : e.replace(/_/g, " ")) : t ? styleText("dim", r.label) : e.replace(/_/g, styleText("dim", " "));
}
function progress({ style: o = "heavy", max: d = 100, size: v = 40, ...x } = {}) {
	const r = spinner(x);
	let a = 0, n = "";
	const c = Math.max(1, d), l = Math.max(1, v), S = (t) => {
		switch (t) {
			case "initial":
			case "active": return (e) => styleText("magenta", e);
			case "error":
			case "cancel": return (e) => styleText("red", e);
			case "submit": return (e) => styleText("green", e);
			default: return (e) => styleText("magenta", e);
		}
	}, p = (t, e) => {
		const m = Math.floor(a / c * l);
		return `${S(t)(u[o].repeat(m))}${styleText("dim", u[o].repeat(l - m))} ${e}`;
	}, h = (t = "") => {
		n = t, r.start(p("initial", t));
	}, g = (t = 1, e) => {
		a = Math.min(c, t + a), r.message(p("active", e ?? n)), n = e ?? n;
	};
	return {
		start: h,
		stop: r.stop,
		cancel: r.cancel,
		error: r.error,
		clear: r.clear,
		advance: g,
		isCancelled: r.isCancelled,
		message: (t) => g(0, t)
	};
}
var import_src, unicode, isCI, isTTY, unicodeOr, S_STEP_ACTIVE, S_STEP_CANCEL, S_STEP_ERROR, S_STEP_SUBMIT, S_BAR_START, S_BAR, S_BAR_END, S_BAR_START_RIGHT, S_BAR_END_RIGHT, S_RADIO_ACTIVE, S_RADIO_INACTIVE, S_CHECKBOX_ACTIVE, S_CHECKBOX_SELECTED, S_CHECKBOX_INACTIVE, S_PASSWORD_MASK, S_BAR_H, S_CORNER_TOP_RIGHT, S_CONNECT_LEFT, S_CORNER_BOTTOM_RIGHT, S_CORNER_BOTTOM_LEFT, S_CORNER_TOP_LEFT, S_INFO, S_SUCCESS, S_WARN, S_ERROR, symbol, symbolBar, I, limitOptions, autocomplete, autocompleteMultiselect, J, K, Q, box, confirm, date, p, group, MULTISELECT_INSTRUCTIONS, m, multiselect, groupMultiselect, log, cancel, intro, outro, multiline, W$1, C, note, password, path$1, W, spinner, u, SELECT_INSTRUCTIONS, c, select, selectKey, i, stream, tasks, A, taskLog, text;
var init_dist = __esmMin((() => {
	init_dist$1();
	init_main();
	init_dist$2();
	import_src = require_src();
	unicode = isUnicodeSupported(), isCI = () => process.env.CI === "true", isTTY = (o) => o.isTTY === true, unicodeOr = (o, e) => unicode ? o : e, S_STEP_ACTIVE = unicodeOr("◆", "*"), S_STEP_CANCEL = unicodeOr("■", "x"), S_STEP_ERROR = unicodeOr("▲", "x"), S_STEP_SUBMIT = unicodeOr("◇", "o"), S_BAR_START = unicodeOr("┌", "T"), S_BAR = unicodeOr("│", "|"), S_BAR_END = unicodeOr("└", "—"), S_BAR_START_RIGHT = unicodeOr("┐", "T"), S_BAR_END_RIGHT = unicodeOr("┘", "—"), S_RADIO_ACTIVE = unicodeOr("●", ">"), S_RADIO_INACTIVE = unicodeOr("○", " "), S_CHECKBOX_ACTIVE = unicodeOr("◻", "[•]"), S_CHECKBOX_SELECTED = unicodeOr("◼", "[+]"), S_CHECKBOX_INACTIVE = unicodeOr("◻", "[ ]"), S_PASSWORD_MASK = unicodeOr("▪", "•"), S_BAR_H = unicodeOr("─", "-"), S_CORNER_TOP_RIGHT = unicodeOr("╮", "+"), S_CONNECT_LEFT = unicodeOr("├", "+"), S_CORNER_BOTTOM_RIGHT = unicodeOr("╯", "+"), S_CORNER_BOTTOM_LEFT = unicodeOr("╰", "+"), S_CORNER_TOP_LEFT = unicodeOr("╭", "+"), S_INFO = unicodeOr("●", "•"), S_SUCCESS = unicodeOr("◆", "*"), S_WARN = unicodeOr("▲", "!"), S_ERROR = unicodeOr("■", "x"), symbol = (o) => {
		switch (o) {
			case "initial":
			case "active": return styleText("cyan", S_STEP_ACTIVE);
			case "cancel": return styleText("red", S_STEP_CANCEL);
			case "error": return styleText("yellow", S_STEP_ERROR);
			case "submit": return styleText("green", S_STEP_SUBMIT);
		}
	}, symbolBar = (o) => {
		switch (o) {
			case "initial":
			case "active": return styleText("cyan", S_BAR);
			case "cancel": return styleText("red", S_BAR);
			case "error": return styleText("yellow", S_BAR);
			case "submit": return styleText("green", S_BAR);
		}
	};
	I = (l, e, w, p, b, C = false) => {
		let r = e, O = 0;
		if (C) for (let i = p - 1; i >= w; i--) {
			const m = l[i];
			if (m && (r -= m.length), O++, r <= b) break;
		}
		else for (let i = w; i < p; i++) {
			const m = l[i];
			if (m && (r -= m.length), O++, r <= b) break;
		}
		return {
			lineCount: r,
			removals: O
		};
	};
	limitOptions = ({ cursor: l, options: e, style: w, output: p = process.stdout, maxItems: b = Number.POSITIVE_INFINITY, columnPadding: C = 0, rowPadding: r = 4 }) => {
		const i = getColumns(p) - C, m = getRows(p), M = styleText("dim", "..."), v = Math.max(m - r, 0), a = Math.max(Math.min(b, v), 5);
		let f = 0;
		l >= a - 3 && (f = Math.max(Math.min(l - a + 3, e.length - a), 0));
		let d = a < e.length && f > 0, c = a < e.length && f + a < e.length;
		const W = Math.min(f + a, e.length), s = [];
		let g = 0;
		d && g++, c && g++;
		const T = f + (d ? 1 : 0), y = W - (c ? 1 : 0);
		for (let t = T; t < y; t++) {
			const n = e[t], h = wrapAnsi(n ? w(n, t === l) : "", i, {
				hard: true,
				trim: false
			}).split(`
`);
			s.push(h), g += h.length;
		}
		if (g > v) {
			let t = 0, n = 0, o = g;
			const h = l - T;
			let u = v;
			const L = () => I(s, o, 0, h, u), E = () => I(s, o, h + 1, s.length, u, true);
			d ? ({lineCount: o, removals: t} = L(), o > u && (c || (u -= 1), {lineCount: o, removals: n} = E())) : (c || (u -= 1), {lineCount: o, removals: n} = E(), o > u && (u -= 1, {lineCount: o, removals: t} = L())), t > 0 && (d = true, s.splice(0, t)), n > 0 && (c = true, s.splice(s.length - n, n));
		}
		const x = [];
		d && x.push(M);
		for (const t of s) for (const n of t) x.push(n);
		return c && x.push(M), x;
	};
	autocomplete = (t) => new T$1({
		options: t.options,
		initialValue: t.initialValue ? [t.initialValue] : void 0,
		initialUserInput: t.initialUserInput,
		placeholder: t.placeholder,
		filter: t.filter ?? ((n, i) => E(n, i)),
		signal: t.signal,
		input: t.input,
		output: t.output,
		validate: t.validate,
		render() {
			const n = t.withGuide ?? settings.withGuide, i = n ? [`${styleText("gray", S_BAR)}`, `${symbol(this.state)}  ${t.message}`] : [`${symbol(this.state)}  ${t.message}`], l = this.userInput, o = this.options, m = t.placeholder, p = l === "" && m !== void 0, $ = (r, s) => {
				const a = P(r), u = r.hint && r.value === this.focusedValue ? styleText("dim", ` (${r.hint})`) : "";
				switch (s) {
					case "active": return `${styleText("green", S_RADIO_ACTIVE)} ${a}${u}`;
					case "inactive": return `${styleText("dim", S_RADIO_INACTIVE)} ${styleText("dim", a)}`;
					case "disabled": return `${styleText("gray", S_RADIO_INACTIVE)} ${styleText(["strikethrough", "gray"], a)}`;
				}
			};
			switch (this.state) {
				case "submit": {
					const r = N(this.selectedValues, o), s = r.length > 0 ? `  ${styleText("dim", r.map(P).join(", "))}` : "", a = n ? styleText("gray", S_BAR) : "";
					return `${i.join(`
`)}
${a}${s}`;
				}
				case "cancel": {
					const r = l ? `  ${styleText(["strikethrough", "dim"], l)}` : "", s = n ? styleText("gray", S_BAR) : "";
					return `${i.join(`
`)}
${s}${r}`;
				}
				default: {
					const r = this.state === "error" ? "yellow" : "cyan", s = n ? `${styleText(r, S_BAR)}  ` : "", a = n ? styleText(r, S_BAR_END) : "";
					let u = "";
					if (this.isNavigating || p) {
						const d = p ? m : l;
						u = d !== "" ? ` ${styleText("dim", d)}` : "";
					} else u = ` ${this.userInputWithCursor}`;
					const V = this.filteredOptions.length !== o.length ? styleText("dim", ` (${this.filteredOptions.length} match${this.filteredOptions.length === 1 ? "" : "es"})`) : "", y = this.filteredOptions.length === 0 && l ? [`${s}${styleText("yellow", "No matches found")}`] : [], b = this.state === "error" ? [`${s}${styleText("yellow", this.error)}`] : [];
					n && i.push(`${s.trimEnd()}`), i.push(`${s}${styleText("dim", "Search:")}${u}${V}`, ...y, ...b);
					const g = [`${s}${[
						`${styleText("dim", "↑/↓")} to select`,
						`${styleText("dim", "Enter:")} confirm`,
						`${styleText("dim", "Type:")} to search`
					].join(" • ")}`, a], O = this.filteredOptions.length === 0 ? [] : limitOptions({
						cursor: this.cursor,
						options: this.filteredOptions,
						columnPadding: n ? 3 : 0,
						rowPadding: i.length + g.length,
						style: (d, f) => $(d, d.disabled ? "disabled" : f ? "active" : "inactive"),
						maxItems: t.maxItems,
						output: t.output
					});
					return [
						...i,
						...O.map((d) => `${s}${d}`),
						...g
					].join(`
`);
				}
			}
		}
	}).prompt(), autocompleteMultiselect = (t) => {
		const c = (i, l, o, m) => {
			const p = o.includes(i.value), $ = i.label ?? String(i.value ?? ""), r = i.hint && m !== void 0 && i.value === m ? styleText("dim", ` (${i.hint})`) : "", s = p ? styleText("green", S_CHECKBOX_SELECTED) : styleText("dim", S_CHECKBOX_INACTIVE);
			return i.disabled ? `${styleText("gray", S_CHECKBOX_INACTIVE)} ${styleText(["strikethrough", "gray"], $)}` : l ? `${s} ${$}${r}` : `${s} ${styleText("dim", $)}`;
		}, n = new T$1({
			options: t.options,
			multiple: true,
			placeholder: t.placeholder,
			filter: t.filter ?? ((i, l) => E(i, l)),
			validate: () => {
				if (t.required && n.selectedValues.length === 0) return "Please select at least one item";
			},
			initialValue: t.initialValues,
			signal: t.signal,
			input: t.input,
			output: t.output,
			render() {
				const i = t.withGuide ?? settings.withGuide, l = `${i ? `${styleText("gray", S_BAR)}
` : ""}${symbol(this.state)}  ${t.message}
`, o = this.userInput, m = t.placeholder, p = o === "" && m !== void 0, $ = this.isNavigating || p ? styleText("dim", p ? m : o) : this.userInputWithCursor, r = this.options, s = this.filteredOptions.length !== r.length ? styleText("dim", ` (${this.filteredOptions.length} match${this.filteredOptions.length === 1 ? "" : "es"})`) : "";
				switch (this.state) {
					case "submit": return `${l}${i ? `${styleText("gray", S_BAR)}  ` : ""}${styleText("dim", `${this.selectedValues.length} items selected`)}`;
					case "cancel": return `${l}${i ? `${styleText("gray", S_BAR)}  ` : ""}${styleText(["strikethrough", "dim"], o)}`;
					default: {
						const a = this.state === "error" ? "yellow" : "cyan", u = i ? `${styleText(a, S_BAR)}  ` : "", V = i ? styleText(a, S_BAR_END) : "", y = [
							`${styleText("dim", "↑/↓")} to navigate`,
							`${styleText("dim", this.isNavigating ? "Space/Tab:" : "Tab:")} select`,
							`${styleText("dim", "Enter:")} confirm`,
							`${styleText("dim", "Type:")} to search`
						], b = this.filteredOptions.length === 0 && o ? [`${u}${styleText("yellow", "No matches found")}`] : [], v = this.state === "error" ? [`${u}${styleText("yellow", this.error)}`] : [], g = [
							...`${l}${i ? styleText(a, S_BAR) : ""}`.split(`
`),
							`${u}${styleText("dim", "Search:")} ${$}${s}`,
							...b,
							...v
						], O = [`${u}${y.join(" • ")}`, V], d = limitOptions({
							cursor: this.cursor,
							options: this.filteredOptions,
							style: (f, _) => c(f, _, this.selectedValues, this.focusedValue),
							maxItems: t.maxItems,
							output: t.output,
							rowPadding: g.length + O.length
						});
						return [
							...g,
							...d.map((f) => `${u}${f}`),
							...O
						].join(`
`);
					}
				}
			}
		});
		return n.prompt();
	};
	J = [
		S_CORNER_TOP_LEFT,
		S_CORNER_TOP_RIGHT,
		S_CORNER_BOTTOM_LEFT,
		S_CORNER_BOTTOM_RIGHT
	], K = [
		S_BAR_START,
		S_BAR_START_RIGHT,
		S_BAR_END,
		S_BAR_END_RIGHT
	];
	Q = (n) => n;
	box = (n = "", e = "", t) => {
		const o = t?.output ?? process.stdout, i = getColumns(o), R = 2, u = t?.titlePadding ?? 1, h = t?.contentPadding ?? 2, w = t?.width === void 0 || t.width === "auto" ? 1 : Math.min(1, t.width), m = t?.withGuide ?? settings.withGuide ? `${S_BAR} ` : "", b = t?.formatBorder ?? Q, a = (t?.rounded ? J : K).map(b), _ = b(S_BAR_H), B = b(S_BAR), p = fastStringWidth(m), x = fastStringWidth(e), O = i - p;
		let r = Math.floor(i * w) - p;
		if (t?.width === "auto") {
			const c = n.split(`
`);
			let s = x + u * 2;
			for (const G of c) {
				const P = fastStringWidth(G) + h * 2;
				P > s && (s = P);
			}
			const g = s + R;
			g < r && (r = g);
		}
		r % 2 !== 0 && (r < O ? r++ : r--);
		const d = r - R, S = d - u * 2, T = x > S ? `${e.slice(0, S - 3)}...` : e, [y, W] = A$1(fastStringWidth(T), d, u, t?.titleAlign), L = wrapAnsi(n, d - h * 2, {
			hard: true,
			trim: false
		});
		o.write(`${m}${a[0]}${_.repeat(y)}${T}${_.repeat(W)}${a[1]}
`);
		const E = L.split(`
`);
		for (const c of E) {
			const [s, g] = A$1(fastStringWidth(c), d, h, t?.contentAlign);
			o.write(`${m}${B}${" ".repeat(s)}${c}${" ".repeat(g)}${B}
`);
		}
		o.write(`${m}${a[2]}${_.repeat(d)}${a[3]}
`);
	};
	confirm = (i) => {
		const a = i.active ?? "Yes", s = i.inactive ?? "No";
		return new r({
			active: a,
			inactive: s,
			signal: i.signal,
			input: i.input,
			output: i.output,
			initialValue: i.initialValue ?? true,
			render() {
				const e = i.withGuide ?? settings.withGuide, u = `${symbol(this.state)}  `, l = e ? `${styleText("gray", S_BAR)}  ` : "", f = wrapTextWithPrefix(i.output, i.message, l, u), o = `${e ? `${styleText("gray", S_BAR)}
` : ""}${f}
`, c = this.value ? a : s;
				switch (this.state) {
					case "submit": return `${o}${e ? `${styleText("gray", S_BAR)}  ` : ""}${styleText("dim", c)}`;
					case "cancel": return `${o}${e ? `${styleText("gray", S_BAR)}  ` : ""}${styleText(["strikethrough", "dim"], c)}${e ? `
${styleText("gray", S_BAR)}` : ""}`;
					default: {
						const r = e ? `${styleText("cyan", S_BAR)}  ` : "", g = e ? styleText("cyan", S_BAR_END) : "";
						return `${o}${r}${this.value ? `${styleText("green", S_RADIO_ACTIVE)} ${a}` : `${styleText("dim", S_RADIO_INACTIVE)} ${styleText("dim", a)}`}${i.vertical ? e ? `
${styleText("cyan", S_BAR)}  ` : `
` : ` ${styleText("dim", "/")} `}${this.value ? `${styleText("dim", S_RADIO_INACTIVE)} ${styleText("dim", s)}` : `${styleText("green", S_RADIO_ACTIVE)} ${s}`}
${g}
`;
					}
				}
			}
		}).prompt();
	};
	date = (e) => {
		const r = e.validate;
		return new U({
			...e,
			validate(t) {
				if (t === void 0) return e.defaultValue !== void 0 ? void 0 : r ? runValidation(r, t) : settings.date.messages.required;
				const o = (i) => i.toISOString().slice(0, 10);
				if (e.minDate && o(t) < o(e.minDate)) return settings.date.messages.afterMin(e.minDate);
				if (e.maxDate && o(t) > o(e.maxDate)) return settings.date.messages.beforeMax(e.maxDate);
				if (r) return runValidation(r, t);
			},
			render() {
				const t = (e?.withGuide ?? settings.withGuide) !== false, i = `${`${t ? `${styleText("gray", S_BAR)}
` : ""}${symbol(this.state)}  `}${e.message}
`, l = this.state !== "initial" ? this.state : "active", d = b(this, l), c = this.value instanceof Date ? this.formattedValue : "";
				switch (this.state) {
					case "error": {
						const a = this.error ? `  ${styleText("yellow", this.error)}` : "", s = t ? `${styleText("yellow", S_BAR)}  ` : "", f = t ? styleText("yellow", S_BAR_END) : "";
						return `${i.trim()}
${s}${d}
${f}${a}
`;
					}
					case "submit": {
						const a = c ? `  ${styleText("dim", c)}` : "";
						return `${i}${t ? styleText("gray", S_BAR) : ""}${a}`;
					}
					case "cancel": {
						const a = c ? `  ${styleText(["strikethrough", "dim"], c)}` : "", s = t ? styleText("gray", S_BAR) : "";
						return `${i}${s}${a}${c.trim() ? `
${s}` : ""}`;
					}
					default: {
						const a = t ? `${styleText("cyan", S_BAR)}  ` : "", s = t ? styleText("cyan", S_BAR_END) : "", f = t ? `${styleText("cyan", S_BAR)}  ` : "";
						return `${i}${a}${d}${this.inlineError ? `
${f}${styleText("yellow", this.inlineError)}` : ""}
${s}
`;
					}
				}
			}
		}).prompt();
	};
	p = {
		year: "yyyy",
		month: "mm",
		day: "dd"
	};
	group = async (o, r) => {
		const t = {}, p = Object.keys(o);
		for (const e of p) {
			const i = o[e], n = await i({ results: t })?.catch((a) => {
				throw a;
			});
			if (typeof r?.onCancel == "function" && isCancel(n)) {
				t[e] = "canceled", r.onCancel({ results: t });
				continue;
			}
			t[e] = n;
		}
		return t;
	};
	MULTISELECT_INSTRUCTIONS = [
		`${styleText("dim", "↑/↓")} to navigate`,
		`${styleText("dim", "Space:")} select`,
		`${styleText("dim", "Enter:")} confirm`
	];
	m = (i, u) => i.split(`
`).map((d) => u(d)).join(`
`);
	multiselect = (i) => {
		const u = (t, a) => {
			const r = t.label ?? String(t.value);
			return a === "disabled" ? `${styleText("gray", S_CHECKBOX_INACTIVE)} ${m(r, (o) => styleText(["strikethrough", "gray"], o))}${t.hint ? ` ${styleText("dim", `(${t.hint ?? "disabled"})`)}` : ""}` : a === "active" ? `${styleText("cyan", S_CHECKBOX_ACTIVE)} ${r}${t.hint ? ` ${styleText("dim", `(${t.hint})`)}` : ""}` : a === "selected" ? `${styleText("green", S_CHECKBOX_SELECTED)} ${m(r, (o) => styleText("dim", o))}${t.hint ? ` ${styleText("dim", `(${t.hint})`)}` : ""}` : a === "cancelled" ? `${m(r, (o) => styleText(["strikethrough", "dim"], o))}` : a === "active-selected" ? `${styleText("green", S_CHECKBOX_SELECTED)} ${r}${t.hint ? ` ${styleText("dim", `(${t.hint})`)}` : ""}` : a === "submitted" ? `${m(r, (o) => styleText("dim", o))}` : `${styleText("dim", S_CHECKBOX_INACTIVE)} ${m(r, (o) => styleText("dim", o))}`;
		}, d = i.required ?? true, v = i.showInstructions ?? true;
		return new a({
			options: i.options,
			signal: i.signal,
			input: i.input,
			output: i.output,
			initialValues: i.initialValues,
			required: d,
			cursorAt: i.cursorAt,
			validate(t) {
				if (d && (t === void 0 || t.length === 0)) return `Please select at least one option.
${styleText("reset", styleText("dim", `Press ${styleText([
					"gray",
					"bgWhite",
					"inverse"
				], " space ")} to select, ${styleText("gray", styleText("bgWhite", styleText("inverse", " enter ")))} to submit`))}`;
			},
			render() {
				const t = i.withGuide ?? settings.withGuide, a = wrapTextWithPrefix(i.output, i.message, t ? `${symbolBar(this.state)}  ` : "", `${symbol(this.state)}  `), r = `${t ? `${styleText("gray", S_BAR)}
` : ""}${a}
`, o = this.value ?? [], p = (n, l) => {
					if (n.disabled) return u(n, "disabled");
					const s = o.includes(n.value);
					return l && s ? u(n, "active-selected") : s ? u(n, "selected") : u(n, l ? "active" : "inactive");
				};
				switch (this.state) {
					case "submit": {
						const n = this.options.filter(({ value: s }) => o.includes(s)).map((s) => u(s, "submitted")).join(styleText("dim", ", ")) || styleText("dim", "none");
						return `${r}${wrapTextWithPrefix(i.output, n, t ? `${styleText("gray", S_BAR)}  ` : "")}`;
					}
					case "cancel": {
						const n = this.options.filter(({ value: s }) => o.includes(s)).map((s) => u(s, "cancelled")).join(styleText("dim", ", "));
						if (n.trim() === "") return `${r}${styleText("gray", S_BAR)}`;
						return `${r}${wrapTextWithPrefix(i.output, n, t ? `${styleText("gray", S_BAR)}  ` : "")}${t ? `
${styleText("gray", S_BAR)}` : ""}`;
					}
					case "error": {
						const n = t ? `${styleText("yellow", S_BAR)}  ` : "", l = this.error.split(`
`).map(($, C) => C === 0 ? `${t ? `${styleText("yellow", S_BAR_END)}  ` : ""}${styleText("yellow", $)}` : `   ${$}`).join(`
`), s = r.split(`
`).length, h = l.split(`
`).length + 1;
						return `${r}${n}${limitOptions({
							output: i.output,
							options: this.options,
							cursor: this.cursor,
							maxItems: i.maxItems,
							columnPadding: n.length,
							rowPadding: s + h,
							style: p
						}).join(`
${n}`)}
${l}
`;
					}
					default: {
						const n = t ? `${styleText("cyan", S_BAR)}  ` : "", l = r.split(`
`).length, s = v ? formatInstructionFooter(MULTISELECT_INSTRUCTIONS, t) : t ? [styleText("cyan", S_BAR_END)] : [], h = s.join(`
`), $ = s.length + 1;
						return `${r}${n}${limitOptions({
							output: i.output,
							options: this.options,
							cursor: this.cursor,
							maxItems: i.maxItems,
							columnPadding: n.length,
							rowPadding: l + $,
							style: p
						}).join(`
${n}`)}
${h}
`;
					}
				}
			}
		}).prompt();
	};
	groupMultiselect = (o) => {
		const { selectableGroups: h = true, groupSpacing: x = 0 } = o, m = (n, l, g = []) => {
			const a = n.label ?? String(n.value), t = typeof n.group == "string", s = t && (g[g.indexOf(n) + 1] ?? { group: true }), u = t && s && s.group === true;
			let r = "", c = "";
			t && (h ? (r = u ? `${S_BAR_END} ` : `${S_BAR} `, c = u ? "  " : `${S_BAR} `) : r = "  ");
			let i = "";
			if (x > 0 && !t && (i = `
`.repeat(x)), l === "active") return wrapTextWithPrefix(o.output, `${a}${n.hint ? ` ${styleText("dim", `(${n.hint})`)}` : ""}`, `${i}${styleText("dim", r)} `, `${i}${styleText("dim", r)}${styleText("cyan", S_CHECKBOX_ACTIVE)} `, `${i}${styleText("dim", c)} `);
			if (l === "group-active") return wrapTextWithPrefix(o.output, a, `${i}${r} `, `${i}${r}${styleText("cyan", S_CHECKBOX_ACTIVE)} `, `${i}${c} `, (d) => styleText("dim", d));
			if (l === "group-active-selected") return wrapTextWithPrefix(o.output, a, `${i}${r} `, `${i}${r}${styleText("green", S_CHECKBOX_SELECTED)} `, `${i}${c} `, (d) => styleText("dim", d));
			if (l === "selected") {
				const d = t || h ? styleText("green", S_CHECKBOX_SELECTED) : "";
				return wrapTextWithPrefix(o.output, `${a}${n.hint ? ` (${n.hint})` : ""}`, `${i}${styleText("dim", r)} `, `${i}${styleText("dim", r)}${d} `, `${i}${styleText("dim", c)} `, (S) => styleText("dim", S));
			}
			if (l === "cancelled") return `${styleText(["strikethrough", "dim"], a)}`;
			if (l === "active-selected") return wrapTextWithPrefix(o.output, `${a}${n.hint ? ` ${styleText("dim", `(${n.hint})`)}` : ""}`, `${i}${styleText("dim", r)} `, `${i}${styleText("dim", r)}${styleText("green", S_CHECKBOX_SELECTED)} `, `${i}${styleText("dim", c)} `);
			if (l === "submitted") return `${styleText("dim", a)}`;
			const f = t || h ? styleText("dim", S_CHECKBOX_INACTIVE) : "";
			return wrapTextWithPrefix(o.output, a, `${i}${styleText("dim", r)} `, `${i}${styleText("dim", r)}${f} `, `${i}${styleText("dim", c)} `, (d) => styleText("dim", d));
		}, y = o.required ?? true, I = o.showInstructions ?? true;
		return new u$2({
			options: o.options,
			signal: o.signal,
			input: o.input,
			output: o.output,
			initialValues: o.initialValues,
			required: y,
			cursorAt: o.cursorAt,
			selectableGroups: h,
			validate(n) {
				if (y && (n === void 0 || n.length === 0)) return `Please select at least one option.
${styleText("reset", styleText("dim", `Press ${styleText([
					"gray",
					"bgWhite",
					"inverse"
				], " space ")} to select, ${styleText("gray", styleText(["bgWhite", "inverse"], " enter "))} to submit`))}`;
			},
			render() {
				const n = o.withGuide ?? settings.withGuide, l = `${n ? `${styleText("gray", S_BAR)}
` : ""}${symbol(this.state)}  ${o.message}
`, g = this.value ?? [], a = (t, s) => {
					const u = this.options, r = g.includes(t.value) || t.group === true && this.isGroupSelected(`${t.value}`);
					return !s && typeof t.group == "string" && this.options[this.cursor]?.value === t.group ? m(t, r ? "group-active-selected" : "group-active", u) : s && r ? m(t, "active-selected", u) : r ? m(t, "selected", u) : m(t, s ? "active" : "inactive", u);
				};
				switch (this.state) {
					case "submit": {
						const t = this.options.filter(({ value: u }) => g.includes(u)).map((u) => m(u, "submitted")), s = t.length === 0 ? "" : `  ${t.join(styleText("dim", ", "))}`;
						return `${l}${n ? styleText("gray", S_BAR) : ""}${s}`;
					}
					case "cancel": {
						const t = this.options.filter(({ value: s }) => g.includes(s)).map((s) => m(s, "cancelled")).join(styleText("dim", ", "));
						return `${l}${n ? `${styleText("gray", S_BAR)}  ` : ""}${t.trim() ? `${t}${n ? `
${styleText("gray", S_BAR)}` : ""}` : ""}`;
					}
					case "error": {
						const t = n ? `${styleText("yellow", S_BAR)}  ` : "", s = this.error.split(`
`).map((i, f) => f === 0 ? `${n ? `${styleText("yellow", S_BAR_END)}  ` : ""}${styleText("yellow", i)}` : `   ${i}`).join(`
`), u = l.split(`
`).length, r = s.split(`
`).length + 1;
						return `${l}${t}${limitOptions({
							output: o.output,
							options: this.options,
							cursor: this.cursor,
							maxItems: o.maxItems,
							columnPadding: t.length,
							rowPadding: u + r,
							style: a
						}).join(`
${t}`)}
${s}
`;
					}
					default: {
						const t = n ? `${styleText("cyan", S_BAR)}  ` : "", s = l.split(`
`).length, u = I ? formatInstructionFooter(MULTISELECT_INSTRUCTIONS, n) : n ? [styleText("cyan", S_BAR_END)] : [], r = u.join(`
`), c = u.length + 1;
						return `${l}${t}${limitOptions({
							output: o.output,
							options: this.options,
							cursor: this.cursor,
							maxItems: o.maxItems,
							columnPadding: t.length,
							rowPadding: s + c,
							style: a
						}).join(`
${t}`)}
${r}
`;
					}
				}
			}
		}).prompt();
	};
	log = {
		message: (s = [], { symbol: e = styleText("gray", S_BAR), secondarySymbol: r = styleText("gray", S_BAR), output: m = process.stdout, spacing: l = 1, withGuide: c } = {}) => {
			const t = [], o = c ?? settings.withGuide, f = o ? r : "", O = o ? `${e}  ` : "", u = o ? `${r}  ` : "";
			for (let i = 0; i < l; i++) t.push(f);
			const g = Array.isArray(s) ? s : s.split(`
`);
			if (g.length > 0) {
				const [i, ...y] = g;
				i.length > 0 ? t.push(`${O}${i}`) : t.push(o ? e : "");
				for (const p of y) p.length > 0 ? t.push(`${u}${p}`) : t.push(o ? r : "");
			}
			m.write(`${t.join(`
`)}
`);
		},
		info: (s, e) => {
			log.message(s, {
				...e,
				symbol: styleText("blue", S_INFO)
			});
		},
		success: (s, e) => {
			log.message(s, {
				...e,
				symbol: styleText("green", S_SUCCESS)
			});
		},
		step: (s, e) => {
			log.message(s, {
				...e,
				symbol: styleText("green", S_STEP_SUBMIT)
			});
		},
		warn: (s, e) => {
			log.message(s, {
				...e,
				symbol: styleText("yellow", S_WARN)
			});
		},
		/** alias for `log.warn()`. */
		warning: (s, e) => {
			log.warn(s, e);
		},
		error: (s, e) => {
			log.message(s, {
				...e,
				symbol: styleText("red", S_ERROR)
			});
		}
	};
	cancel = (o = "", t) => {
		const i = t?.output ?? process.stdout, e = t?.withGuide ?? settings.withGuide ? `${styleText("gray", S_BAR_END)}  ` : "";
		i.write(`${e}${styleText("red", o)}

`);
	}, intro = (o = "", t) => {
		const i = t?.output ?? process.stdout, e = t?.withGuide ?? settings.withGuide ? `${styleText("gray", S_BAR_START)}  ` : "";
		i.write(`${e}${o}
`);
	}, outro = (o = "", t) => {
		const i = t?.output ?? process.stdout, e = t?.withGuide ?? settings.withGuide ? `${styleText("gray", S_BAR)}
${styleText("gray", S_BAR_END)}  ` : "";
		i.write(`${e}${o}

`);
	};
	multiline = (e) => new h({
		validate: e.validate,
		placeholder: e.placeholder,
		defaultValue: e.defaultValue,
		initialValue: e.initialValue,
		showSubmit: e.showSubmit,
		output: e.output,
		signal: e.signal,
		input: e.input,
		render() {
			const i = e?.withGuide ?? settings.withGuide, o = `${`${i ? `${styleText("gray", S_BAR)}
` : ""}${symbol(this.state)}  `}${e.message}
`, m = e.placeholder && e.placeholder.length > 0 ? styleText("inverse", e.placeholder[0]) + styleText("dim", e.placeholder.slice(1)) : styleText(["inverse", "hidden"], "_"), a = this.userInput ? this.userInputWithCursor : m, l = this.value ?? "", c = e.showSubmit ? `
  ${styleText(this.focused === "submit" ? "cyan" : "dim", "[ submit ]")}` : "";
			switch (this.state) {
				case "error": {
					const n = `${styleText("yellow", S_BAR)}  `;
					return `${o}${i ? wrapTextWithPrefix(e.output, a, n, void 0) : a}
${styleText("yellow", S_BAR_END)}  ${styleText("yellow", this.error)}${c}
`;
				}
				case "submit": {
					const n = `${styleText("gray", S_BAR)}  `;
					return `${o}${i ? wrapTextWithPrefix(e.output, l, n, void 0, void 0, (u) => styleText("dim", u)) : l ? styleText("dim", l) : ""}`;
				}
				case "cancel": {
					const n = `${styleText("gray", S_BAR)}  `;
					return `${o}${i ? wrapTextWithPrefix(e.output, l, n, void 0, void 0, (u) => styleText(["strikethrough", "dim"], u)) : l ? styleText(["strikethrough", "dim"], l) : ""}`;
				}
				default: {
					const n = i ? `${styleText("cyan", S_BAR)}  ` : "", r = i ? styleText("cyan", S_BAR_END) : "";
					return `${o}${i ? wrapTextWithPrefix(e.output, a, n) : a}
${r}${c}
`;
				}
			}
		}
	}).prompt();
	W$1 = (o) => o, C = (o, e, s) => {
		const a = {
			hard: true,
			trim: false
		}, i = wrapAnsi(o, e, a).split(`
`), c = i.reduce((n, t) => Math.max(fastStringWidth(t), n), 0);
		return wrapAnsi(o, e - (i.map(s).reduce((n, t) => Math.max(fastStringWidth(t), n), 0) - c), a);
	};
	note = (o = "", e = "", s) => {
		const a = s?.output ?? process$1.stdout, i = s?.withGuide ?? settings.withGuide, c = s?.format ?? W$1, g = [
			"",
			...C(o, getColumns(a) - 6, c).split(`
`).map(c),
			""
		], n = fastStringWidth(e), t = Math.max(g.reduce((m, F) => {
			const O = fastStringWidth(F);
			return O > m ? O : m;
		}, 0), n) + 2, h = g.map((m) => `${styleText("gray", S_BAR)}  ${m}${" ".repeat(t - fastStringWidth(m))}${styleText("gray", S_BAR)}`).join(`
`), T = i ? `${styleText("gray", S_BAR)}
` : "", l$1 = i ? S_CONNECT_LEFT : S_CORNER_BOTTOM_LEFT;
		a.write(`${T}${styleText("green", S_STEP_SUBMIT)}  ${styleText("reset", e)} ${styleText("gray", S_BAR_H.repeat(Math.max(t - n - 1, 1)) + S_CORNER_TOP_RIGHT)}
${h}
${styleText("gray", l$1 + S_BAR_H.repeat(t + 2) + S_CORNER_BOTTOM_RIGHT)}
`);
	};
	password = (r) => new u$1({
		validate: r.validate,
		mask: r.mask ?? S_PASSWORD_MASK,
		signal: r.signal,
		input: r.input,
		output: r.output,
		render() {
			const e = r.withGuide ?? settings.withGuide, o = `${e ? `${styleText("gray", S_BAR)}
` : ""}${symbol(this.state)}  ${r.message}
`, c = this.userInputWithCursor, i = this.masked;
			switch (this.state) {
				case "error": {
					const s = e ? `${styleText("yellow", S_BAR)}  ` : "", n = e ? `${styleText("yellow", S_BAR_END)}  ` : "", l = i ?? "";
					return r.clearOnError && this.clear(), `${o.trim()}
${s}${l}
${n}${styleText("yellow", this.error)}
`;
				}
				case "submit": return `${o}${e ? `${styleText("gray", S_BAR)}  ` : ""}${i ? styleText("dim", i) : ""}`;
				case "cancel": return `${o}${e ? `${styleText("gray", S_BAR)}  ` : ""}${i ? styleText(["strikethrough", "dim"], i) : ""}${i && e ? `
${styleText("gray", S_BAR)}` : ""}`;
				default: return `${o}${e ? `${styleText("cyan", S_BAR)}  ` : ""}${c}
${e ? styleText("cyan", S_BAR_END) : ""}
`;
			}
		}
	}).prompt();
	path$1 = (e) => {
		const a = e.validate;
		return autocomplete({
			...e,
			initialUserInput: e.initialValue ?? e.root ?? process.cwd(),
			maxItems: 5,
			validate(t) {
				if (!Array.isArray(t)) {
					if (!t) return "Please select a path";
					if (a) return runValidation(a, t);
				}
			},
			options() {
				const t = this.userInput;
				if (t === "") return [];
				try {
					let i;
					existsSync(t) ? lstatSync(t).isDirectory() && (!e.directory || t.endsWith("/")) ? i = t : i = dirname(t) : i = dirname(t);
					const c = t.length > 1 && t.endsWith("/") ? t.slice(0, -1) : t;
					return readdirSync(i).map((r) => {
						const n = join(i, r);
						return {
							name: r,
							path: n,
							isDirectory: lstatSync(n).isDirectory()
						};
					}).filter(({ path: r, isDirectory: n }) => r.startsWith(c) && (n || !e.directory)).map((r) => ({ value: r.path }));
				} catch {
					return [];
				}
			}
		});
	};
	W = (l) => styleText("magenta", l);
	spinner = ({ indicator: l = "dots", onCancel: h, output: n = process.stdout, cancelMessage: G, errorMessage: O, frames: E = unicode ? [
		"◒",
		"◐",
		"◓",
		"◑"
	] : [
		"•",
		"o",
		"O",
		"0"
	], delay: F = unicode ? 80 : 120, signal: m, ...I } = {}) => {
		const u = isCI();
		let M, T, d = false, S = false, s = "", p, w = performance.now();
		const x = getColumns(n), k = I?.styleFrame ?? W, g = (e) => {
			const r = e > 1 ? O ?? settings.messages.error : G ?? settings.messages.cancel;
			S = e === 1, d && (a(r, e), S && typeof h == "function" && h());
		}, f = () => g(2), i = () => g(1), A = () => {
			process.on("uncaughtExceptionMonitor", f), process.on("unhandledRejection", f), process.on("SIGINT", i), process.on("SIGTERM", i), process.on("exit", g), m && m.addEventListener("abort", i);
		}, H = () => {
			process.removeListener("uncaughtExceptionMonitor", f), process.removeListener("unhandledRejection", f), process.removeListener("SIGINT", i), process.removeListener("SIGTERM", i), process.removeListener("exit", g), m && m.removeEventListener("abort", i);
		}, y = () => {
			if (p === void 0) return;
			u && n.write(`
`);
			const r = wrapAnsi(p, x, {
				hard: true,
				trim: false
			}).split(`
`);
			r.length > 1 && n.write(import_src.cursor.up(r.length - 1)), n.write(import_src.cursor.to(0)), n.write(import_src.erase.down());
		}, C = (e) => e.replace(/\.+$/, ""), _ = (e) => {
			const r = (performance.now() - e) / 1e3, t = Math.floor(r / 60), o = Math.floor(r % 60);
			return t > 0 ? `[${t}m ${o}s]` : `[${o}s]`;
		}, N = I.withGuide ?? settings.withGuide, P = (e = "") => {
			d = true, M = block({ output: n }), s = C(e), w = performance.now(), N && n.write(`${styleText("gray", S_BAR)}
`);
			let r = 0, t = 0;
			A(), T = setInterval(() => {
				if (u && s === p) return;
				y(), p = s;
				const o = k(E[r]);
				let v;
				if (u) v = `${o}  ${s}...`;
				else if (l === "timer") v = `${o}  ${s} ${_(w)}`;
				else {
					const B = ".".repeat(Math.floor(t)).slice(0, 3);
					v = `${o}  ${s}${B}`;
				}
				const j = wrapAnsi(v, x, {
					hard: true,
					trim: false
				});
				n.write(j), r = r + 1 < E.length ? r + 1 : 0, t = t < 4 ? t + .125 : 0;
			}, F);
		}, a = (e = "", r = 0, t = false) => {
			if (!d) return;
			d = false, clearInterval(T), y();
			const o = r === 0 ? styleText("green", S_STEP_SUBMIT) : r === 1 ? styleText("red", S_STEP_CANCEL) : styleText("red", S_STEP_ERROR);
			s = e ?? s, t || (l === "timer" ? n.write(`${o}  ${s} ${_(w)}
`) : n.write(`${o}  ${s}
`)), H(), M();
		};
		return {
			start: P,
			stop: (e = "") => a(e, 0),
			message: (e = "") => {
				s = C(e ?? s);
			},
			cancel: (e = "") => a(e, 1),
			error: (e = "") => a(e, 2),
			clear: () => a("", 0, true),
			get isCancelled() {
				return S;
			}
		};
	};
	u = {
		light: unicodeOr("─", "-"),
		heavy: unicodeOr("━", "="),
		block: unicodeOr("█", "#")
	};
	SELECT_INSTRUCTIONS = [`${styleText("dim", "↑/↓")} to navigate`, `${styleText("dim", "Enter:")} confirm`];
	c = (t, o) => t.includes(`
`) ? t.split(`
`).map((d) => o(d)).join(`
`) : o(t);
	select = (t) => {
		const o = (n, m) => {
			if (n === void 0) return "";
			const s = n.label ?? String(n.value);
			switch (m) {
				case "disabled": return `${styleText("gray", S_RADIO_INACTIVE)} ${c(s, (i) => styleText("gray", i))}${n.hint ? ` ${styleText("dim", `(${n.hint ?? "disabled"})`)}` : ""}`;
				case "selected": return `${c(s, (i) => styleText("dim", i))}`;
				case "active": return `${styleText("green", S_RADIO_ACTIVE)} ${s}${n.hint ? ` ${styleText("dim", `(${n.hint})`)}` : ""}`;
				case "cancelled": return `${c(s, (i) => styleText(["strikethrough", "dim"], i))}`;
				default: return `${styleText("dim", S_RADIO_INACTIVE)} ${c(s, (i) => styleText("dim", i))}`;
			}
		}, d = t.showInstructions ?? true;
		return new n$1({
			options: t.options,
			signal: t.signal,
			input: t.input,
			output: t.output,
			initialValue: t.initialValue,
			render() {
				const n = t.withGuide ?? settings.withGuide, m = `${symbol(this.state)}  `, s = `${symbolBar(this.state)}  `, i = wrapTextWithPrefix(t.output, t.message, s, m), u = `${n ? `${styleText("gray", S_BAR)}
` : ""}${i}
`;
				switch (this.state) {
					case "submit": {
						const r = n ? `${styleText("gray", S_BAR)}  ` : "";
						return `${u}${wrapTextWithPrefix(t.output, o(this.options[this.cursor], "selected"), r)}`;
					}
					case "cancel": {
						const r = n ? `${styleText("gray", S_BAR)}  ` : "";
						return `${u}${wrapTextWithPrefix(t.output, o(this.options[this.cursor], "cancelled"), r)}${n ? `
${styleText("gray", S_BAR)}` : ""}`;
					}
					default: {
						const r = n ? `${styleText("cyan", S_BAR)}  ` : "", a = u.split(`
`).length, p = d ? formatInstructionFooter(SELECT_INSTRUCTIONS, n) : n ? [styleText("cyan", S_BAR_END)] : [], b = p.join(`
`), f = p.length + 1;
						return `${u}${r}${limitOptions({
							output: t.output,
							cursor: this.cursor,
							options: this.options,
							maxItems: t.maxItems,
							columnPadding: r.length,
							rowPadding: a + f,
							style: (g, x) => o(g, g.disabled ? "disabled" : x ? "active" : "inactive")
						}).join(`
${r}`)}
${b}
`;
					}
				}
			}
		}).prompt();
	};
	selectKey = (t) => {
		const l = (e, a = "inactive") => {
			if (e === void 0) return "";
			const n = e.label ?? String(e.value);
			return a === "selected" ? `${styleText("dim", n)}` : a === "cancelled" ? `${styleText(["strikethrough", "dim"], n)}` : a === "active" ? `${styleText(["bgCyan", "gray"], ` ${e.value} `)} ${n}${e.hint ? ` ${styleText("dim", `(${e.hint})`)}` : ""}` : `${styleText([
				"gray",
				"bgWhite",
				"inverse"
			], ` ${e.value} `)} ${n}${e.hint ? ` ${styleText("dim", `(${e.hint})`)}` : ""}`;
		};
		return new u$3({
			options: t.options,
			signal: t.signal,
			input: t.input,
			output: t.output,
			initialValue: t.initialValue,
			caseSensitive: t.caseSensitive,
			render() {
				const e = t.withGuide ?? settings.withGuide, a = `${e ? `${styleText("gray", S_BAR)}
` : ""}${symbol(this.state)}  ${t.message}
`;
				switch (this.state) {
					case "submit": {
						const n = e ? `${styleText("gray", S_BAR)}  ` : "", s = this.options.find((u) => u.value === this.value) ?? t.options[0];
						return `${a}${wrapTextWithPrefix(t.output, l(s, "selected"), n)}`;
					}
					case "cancel": {
						const n = e ? `${styleText("gray", S_BAR)}  ` : "";
						return `${a}${wrapTextWithPrefix(t.output, l(this.options[0], "cancelled"), n)}${e ? `
${styleText("gray", S_BAR)}` : ""}`;
					}
					default: {
						const n = e ? `${styleText("cyan", S_BAR)}  ` : "", s = e ? styleText("cyan", S_BAR_END) : "";
						return `${a}${this.options.map((u, d) => wrapTextWithPrefix(t.output, l(u, d === this.cursor ? "active" : "inactive"), n)).join(`
`)}
${s}
`;
					}
				}
			}
		}).prompt();
	};
	i = `${styleText("gray", S_BAR)}  `;
	stream = {
		message: async (e, { symbol: l = styleText("gray", S_BAR) } = {}) => {
			process.stdout.write(`${styleText("gray", S_BAR)}
${l}  `);
			let s = 3;
			for await (let r of e) {
				r = r.replace(/\n/g, `
${i}`), r.includes(`
`) && (s = 3 + stripVTControlCharacters(r.slice(r.lastIndexOf(`
`))).length);
				const o = stripVTControlCharacters(r).length;
				s + o < process.stdout.columns ? (s += o, process.stdout.write(r)) : (process.stdout.write(`
${i}${r.trimStart()}`), s = 3 + stripVTControlCharacters(r.trimStart()).length);
			}
			process.stdout.write(`
`);
		},
		info: (e) => stream.message(e, { symbol: styleText("blue", S_INFO) }),
		success: (e) => stream.message(e, { symbol: styleText("green", S_SUCCESS) }),
		step: (e) => stream.message(e, { symbol: styleText("green", S_STEP_SUBMIT) }),
		warn: (e) => stream.message(e, { symbol: styleText("yellow", S_WARN) }),
		/** alias for `log.warn()`. */
		warning: (e) => stream.warn(e),
		error: (e) => stream.message(e, { symbol: styleText("red", S_ERROR) })
	};
	tasks = async (o, e) => {
		for (const t of o) {
			if (t.enabled === false) continue;
			const s = spinner(e);
			s.start(t.title);
			const n = await t.task(s.message);
			s.stop(n || t.title);
		}
	};
	A = (l) => l.replace(/\x1b\[(?:\d+;)*\d*[ABCDEFGHfJKSTsu]|\x1b\[(s|u)/g, "");
	taskLog = (l) => {
		const r = l.output ?? process.stdout, O = getColumns(r), i = styleText("gray", S_BAR), p = l.spacing ?? 1, k = 3, m = l.retainLog === true, d = !isCI() && isTTY(r);
		r.write(`${i}
`), r.write(`${styleText("green", S_STEP_SUBMIT)}  ${l.title}
`);
		for (let e = 0; e < p; e++) r.write(`${i}
`);
		const n = [{
			value: "",
			full: ""
		}];
		let v = false;
		const f = (e) => {
			if (n.length === 0) return;
			let s = 0;
			e && (s += p + 2);
			for (const t of n) {
				const { value: o, result: a } = t;
				let g = a?.message ?? o;
				if (g.length === 0) continue;
				a === void 0 && t.header !== void 0 && t.header !== "" && (g += `
${t.header}`);
				const E = g.split(`
`).reduce((b, w) => w === "" ? b + 1 : b + Math.ceil((w.length + k) / O), 0);
				s += E;
			}
			s > 0 && (s += 1, r.write(import_src.erase.lines(s)));
		}, h = (e, s, t) => {
			const o = t ? `${e.full}
${e.value}` : e.value;
			e.header !== void 0 && e.header !== "" && log.message(e.header.split(`
`).map((a) => styleText("bold", a)), {
				output: r,
				secondarySymbol: i,
				symbol: i,
				spacing: 0
			}), log.message(o.split(`
`).map((a) => styleText("dim", a)), {
				output: r,
				secondarySymbol: i,
				symbol: i,
				spacing: s ?? p
			});
		}, T = () => {
			for (const e of n) {
				const { header: s, value: t, full: o } = e;
				(s === void 0 || s.length === 0) && t.length === 0 || h(e, void 0, m === true && o.length > 0);
			}
		}, L = (e, s, t) => {
			if (f(false), (t?.raw !== true || !v) && e.value !== "" && (e.value += `
`), e.value += A(s), v = t?.raw === true, l.limit !== void 0) {
				const o = e.value.split(`
`), a = o.length - l.limit;
				if (a > 0) {
					const g = o.splice(0, a);
					m && (e.full += (e.full === "" ? "" : `
`) + g.join(`
`));
				}
				e.value = o.join(`
`);
			}
			d && y();
		}, y = () => {
			for (const e of n) e.result ? e.result.status === "error" ? log.error(e.result.message, {
				output: r,
				secondarySymbol: i,
				spacing: 0
			}) : log.success(e.result.message, {
				output: r,
				secondarySymbol: i,
				spacing: 0
			}) : e.value !== "" && h(e, 0);
		}, B = (e, s) => {
			f(false), e.result = s, d && y();
		};
		return {
			message(e, s) {
				L(n[0], e, s);
			},
			group(e) {
				const s = {
					header: e,
					value: "",
					full: ""
				};
				return n.push(s), {
					message(t, o) {
						L(s, t, o);
					},
					error(t) {
						B(s, {
							status: "error",
							message: t
						});
					},
					success(t) {
						B(s, {
							status: "success",
							message: t
						});
					}
				};
			},
			error(e, s) {
				f(true), log.error(e, {
					output: r,
					secondarySymbol: i,
					spacing: 1
				}), s?.showLog !== false && T(), n.splice(1, n.length - 1), n[0].value = "", n[0].full = "";
			},
			success(e, s) {
				f(true), log.success(e, {
					output: r,
					secondarySymbol: i,
					spacing: 1
				}), s?.showLog === true && T(), n.splice(1, n.length - 1), n[0].value = "", n[0].full = "";
			}
		};
	};
	text = (e) => new n({
		validate: e.validate,
		placeholder: e.placeholder,
		defaultValue: e.defaultValue,
		initialValue: e.initialValue,
		output: e.output,
		signal: e.signal,
		input: e.input,
		render() {
			const i = e?.withGuide ?? settings.withGuide, s = `${`${i ? `${styleText("gray", S_BAR)}
` : ""}${symbol(this.state)}  `}${e.message}
`, c = e.placeholder && e.placeholder.length > 0 ? styleText("inverse", e.placeholder[0]) + styleText("dim", e.placeholder.slice(1)) : styleText(["inverse", "hidden"], "_"), o = this.userInput ? this.userInputWithCursor : c, l = this.value ?? "";
			switch (this.state) {
				case "error": {
					const n = this.error ? `  ${styleText("yellow", this.error)}` : "", r = i ? `${styleText("yellow", S_BAR)}  ` : "", d = i ? styleText("yellow", S_BAR_END) : "";
					return `${s.trim()}
${r}${o}
${d}${n}
`;
				}
				case "submit": {
					const n = l ? `  ${styleText("dim", l)}` : "";
					return `${s}${i ? styleText("gray", S_BAR) : ""}${n}`;
				}
				case "cancel": {
					const n = l ? `  ${styleText(["strikethrough", "dim"], l)}` : "", r = i ? styleText("gray", S_BAR) : "";
					return `${s}${r}${n}${l.trim() ? `
${r}` : ""}`;
				}
				default: return `${s}${i ? `${styleText("cyan", S_BAR)}  ` : ""}${o}
${i ? styleText("cyan", S_BAR_END) : ""}
`;
			}
		}
	}).prompt();
}));
//#endregion
//#region src/commands/init.ts
var init_exports = /* @__PURE__ */ __exportAll({ default: () => init_default });
var import_picocolors$5, __dirname$2, PKG_ROOT$1, TEMPLATES_DIR$1, PKG_VERSION$1, MODE_LINE, MODE_LINE_LOCAL, init_default;
var init_init = __esmMin((() => {
	init_dist$6();
	import_picocolors$5 = /* @__PURE__ */ __toESM(require_picocolors(), 1);
	init_constants();
	init_copy_skills();
	init_marker_block();
	init_lock_file();
	init_config();
	init_settings_hooks();
	init_git_exclude();
	init_build_index();
	__dirname$2 = path.dirname(fileURLToPath(import.meta.url));
	PKG_ROOT$1 = path.basename(__dirname$2) === "dist" || path.basename(__dirname$2) === "cli" ? path.resolve(__dirname$2, "..") : path.resolve(__dirname$2, "..", "..");
	TEMPLATES_DIR$1 = path.join(PKG_ROOT$1, "templates", "skills");
	PKG_VERSION$1 = createRequire(import.meta.url)(path.join(PKG_ROOT$1, "package.json")).version;
	MODE_LINE = {
		ask: "ask — Claude offers a drafted entry after substantive work (.whydone/config.json, committed)",
		auto: "auto — Claude writes entries itself; review them in git diff (.whydone/config.json, committed)",
		manual: "manual — entries only via /log"
	};
	MODE_LINE_LOCAL = {
		ask: "ask — Claude offers a drafted entry after substantive work (.whydone/config.json, local)",
		auto: "auto — Claude writes entries itself; review the files in .whydone/ directly — a local journal never appears in git diff",
		manual: "manual — entries only via /log"
	};
	init_default = defineCommand({
		meta: {
			name: "init",
			description: "Scaffold whydone: create .whydone/, install skills, patch CLAUDE.md"
		},
		args: {
			mode: {
				type: "string",
				description: "Set journal mode non-interactively (ask | auto | manual)"
			},
			language: {
				type: "string",
				description: "Language of the entry prose /log writes, as a tag like en or ru (recorded in .whydone/config.json; default: the language you talk to Claude in)"
			},
			yes: {
				type: "boolean",
				description: "Accept the recommended setup non-interactively: mode ask + Stop hook",
				default: false
			},
			"journal-only": {
				type: "boolean",
				description: "Scaffold only .whydone/ and the CLAUDE.md marker — no skills, no lock-file, no hook (plugin channel provides those)",
				default: false
			},
			local: {
				type: "boolean",
				description: "Keep the journal out of git: hide .whydone/ (and an untracked CLAUDE.md) via .git/info/exclude, record storage: local",
				default: false
			},
			hook: {
				type: "boolean",
				description: "Install the Stop hook; --no-hook never touches any settings file",
				default: true
			},
			force: {
				type: "boolean",
				description: "Reinstall/overwrite existing skills",
				default: false
			},
			global: {
				type: "boolean",
				description: "Install into ~/.claude/ instead of project .claude/",
				default: false
			},
			"dry-run": {
				type: "boolean",
				description: "Print plan without writing any files",
				default: false
			},
			quiet: {
				type: "boolean",
				description: "Suppress non-error output",
				default: false
			},
			"no-color": {
				type: "boolean",
				description: "Disable ANSI color output",
				default: false
			}
		},
		async run({ args }) {
			const useColor = !args["no-color"];
			const dim = (s) => useColor ? import_picocolors$5.default.dim(s) : s;
			const green = (s) => useColor ? import_picocolors$5.default.green(s) : s;
			const bold = (s) => useColor ? import_picocolors$5.default.bold(s) : s;
			const yellow = (s) => useColor ? import_picocolors$5.default.yellow(s) : s;
			if (args.mode !== void 0 && !isWhydoneMode(args.mode)) {
				process.stderr.write("error: --mode must be ask, auto, or manual\n");
				process.exit(1);
				return;
			}
			if (args.language !== void 0 && !isLanguageTag(args.language)) {
				process.stderr.write("error: --language must be a language tag like en, ru or pt-BR\n");
				process.exit(1);
				return;
			}
			const languageSuffix = args.language !== void 0 ? `, language: ${args.language}` : "";
			const cwd = process.cwd();
			const scope = args.global ? "global" : "project";
			const targetBase = args.global ? path.join(homedir(), ".claude") : path.resolve(cwd, ".claude");
			const journalDir = path.resolve(cwd, JOURNAL_DIR);
			const skillsDir = path.join(targetBase, "skills");
			const lockPath = path.join(targetBase, "whydone.lock.json");
			const claudeMdPath = args.global ? path.join(homedir(), ".claude", "CLAUDE.md") : path.resolve(cwd, "CLAUDE.md");
			const indexPath = args.global ? `${JOURNAL_DIR}/INDEX.md` : toPosixPath(path.relative(cwd, path.join(journalDir, "INDEX.md")));
			const settingsPath = args.global ? path.join(homedir(), ".claude", "settings.json") : path.resolve(cwd, ".claude", "settings.local.json");
			const settingsDisplay = args.global ? "~/.claude/settings.json" : ".claude/settings.local.json";
			const launcherPath = path.join(targetBase, LAUNCHER_BASENAME);
			const configPath = path.join(journalDir, CONFIG_BASENAME);
			if (args["journal-only"]) {
				if (args.global) {
					process.stderr.write("error: --journal-only is project-scoped; drop --global\n");
					process.exit(1);
					return;
				}
				if (args.yes) {
					process.stderr.write("error: --yes implies the Stop-hook setup that --journal-only skips; use --mode instead\n");
					process.exit(1);
					return;
				}
				if (args.local && isTracked(cwd, ".whydone")) {
					process.stderr.write(`error: ${JOURNAL_DIR}/ is already tracked by git — --local cannot hide tracked files.\n  Untrack it first (deliberate, history-visible; committed entries stay in git history):
    git rm -r --cached ${JOURNAL_DIR} && git commit -m "untrack journal"\n  then re-run with --local, or use \`whydone hide\`.
`);
					process.exit(1);
					return;
				}
				const jlExisting = await readConfigIfValid(journalDir);
				const jlConfigInvalid = existsSync(configPath) && jlExisting === null;
				const jlMode = args.mode !== void 0 && isWhydoneMode(args.mode) ? args.mode : jlExisting?.mode ?? "ask";
				if (args["dry-run"]) {
					process.stdout.write(bold("whydone init --journal-only dry-run plan:\n"));
					process.stdout.write(green("  [create]") + " " + dim(path.relative(cwd, journalDir) + "/\n"));
					process.stdout.write(green("  [create]") + " " + dim(indexPath + " (seed, skipped if present)\n"));
					process.stdout.write(green("  [create/update]") + " " + dim("CLAUDE.md (marker block)\n"));
					process.stdout.write(green("  [create]") + " " + dim(`${JOURNAL_DIR}/config.json (mode: ${jlMode}${languageSuffix})\n`));
					process.stdout.write(green("  [create]") + " " + dim(`${JOURNAL_DIR}/.cache/.gitignore\n`));
					if (args.local) process.stdout.write(green("  [update]") + " " + dim(`.git/info/exclude (hide ${JOURNAL_DIR}/, storage: local)\n`));
					process.stdout.write(green("  [skip]") + " " + dim("skills, lock-file, Stop hook (--journal-only)\n"));
					return;
				}
				await mkdir(journalDir, { recursive: true });
				try {
					await writeFile(path.join(journalDir, "INDEX.md"), buildIndexContent([]), {
						encoding: "utf-8",
						flag: "wx"
					});
				} catch (err) {
					if (err.code !== "EEXIST") throw err;
				}
				await patchClaudeMd(claudeMdPath, indexPath, "project");
				if (!existsSync(configPath) || jlConfigInvalid || args.mode !== void 0 || args.local || args.language !== void 0) {
					await writeConfigMode(journalDir, jlMode, args.local ? "local" : void 0, args.language);
					if (jlConfigInvalid) process.stderr.write(yellow("warn") + `: ${JOURNAL_DIR}/config.json was invalid — rewritten with mode ${jlMode}\n`);
				}
				const jlStorage = args.local ? "local" : jlExisting?.storage ?? "committed";
				let jlNoGit = false;
				let jlClaudeMdVisible = false;
				if (args.local) {
					const toExclude = [`${JOURNAL_DIR}/`];
					const claudeMdTracked = isTracked(cwd, "CLAUDE.md");
					if (!claudeMdTracked) toExclude.push("CLAUDE.md");
					const wrote = await ensureExcluded(cwd, toExclude);
					jlNoGit = !wrote;
					jlClaudeMdVisible = wrote && claudeMdTracked;
					if (jlClaudeMdVisible) process.stderr.write(yellow("warn") + ": CLAUDE.md is tracked by git — the whydone marker block in it shows up in git status.\n      Do not commit that change (`git restore CLAUDE.md` removes it; `whydone hide`/`publish` manage it).\n");
				}
				await mkdir(path.join(journalDir, ".cache"), { recursive: true });
				try {
					await writeFile(path.join(journalDir, ".cache", ".gitignore"), "*\n", {
						encoding: "utf-8",
						flag: "wx"
					});
				} catch (err) {
					if (err.code !== "EEXIST") throw err;
				}
				if (!args.quiet) {
					const jlLocal = jlStorage === "local";
					const jlModeLine = jlLocal ? MODE_LINE_LOCAL[jlMode] : MODE_LINE[jlMode];
					const jlLanguage = args.language ?? jlExisting?.language;
					const jlLanguageLine = jlLanguage !== void 0 ? `  Language:     ${jlLanguage} (entry prose; .whydone/config.json)\n` : "";
					const tail = jlLocal ? jlNoGit ? "  Storage:      local (no git repo here — nothing was excluded; the journal is machine-only)\n" : "  Storage:      LOCAL-ONLY — hidden via .git/info/exclude, never committed, no backup.\n                Make it a committed team journal later: whydone publish\n" : "  Commit the shared parts: git add " + JOURNAL_DIR + " CLAUDE.md\n";
					process.stdout.write(bold("whydone init --journal-only") + ` complete
  Journal dir:  ${dim(path.relative(cwd, journalDir) + "/")}\n  Mode:         ${jlModeLine}\n` + jlLanguageLine + "  CLAUDE.md:    marker block added/refreshed\n  Skipped:      skills, lock-file, Stop hook — the plugin ships them;\n                on the npm channel run `npx whydone init` for the full setup\n\n" + tail);
				}
				return;
			}
			const interactive = process.stdin.isTTY === true && process.stdout.isTTY === true && !process.env.CI && !args.yes && !args.mode && !args["dry-run"] && !args.quiet;
			const existingConfig = await readConfigIfValid(journalDir);
			let mode;
			let explicit;
			let interactiveConsent = false;
			let wizardLocal = false;
			let wizardAskedStorage = false;
			if (args.mode !== void 0 && isWhydoneMode(args.mode)) {
				mode = args.mode;
				explicit = true;
			} else if (args.yes) {
				mode = "ask";
				explicit = true;
			} else if (interactive) {
				const clack = await Promise.resolve().then(() => (init_dist(), dist_exports));
				clack.intro("whydone — Done. And why.");
				const selected = await clack.select({
					message: "Journal mode — how entries get written:",
					options: [
						{
							value: "ask",
							label: "ask (recommended)",
							hint: "after substantive work, Claude drafts an entry and asks before writing"
						},
						{
							value: "auto",
							label: "auto",
							hint: "Claude writes entries itself; you review them in git diff"
						},
						{
							value: "manual",
							label: "manual",
							hint: "only when you run /log"
						}
					],
					initialValue: existingConfig?.mode ?? "ask"
				});
				if (clack.isCancel(selected)) {
					clack.cancel("Operation cancelled — nothing was written.");
					process.exit(0);
					return;
				}
				mode = selected;
				explicit = true;
				if (existingConfig === null) {
					wizardAskedStorage = true;
					const storageSel = await clack.select({
						message: "Journal storage — where entries live:",
						options: [{
							value: "committed",
							label: "committed (recommended)",
							hint: "ordinary repo files — commit them, teammates and CI see the journal"
						}, {
							value: "local",
							label: "local",
							hint: "hidden from git via .git/info/exclude — this machine only, no backup"
						}],
						initialValue: "committed"
					});
					if (clack.isCancel(storageSel)) {
						clack.cancel("Operation cancelled — nothing was written.");
						process.exit(0);
						return;
					}
					wizardLocal = storageSel === "local";
				}
				if (mode !== "manual" && args.hook !== false) {
					const consent = await clack.confirm({
						message: `Install a Stop hook into ${settingsDisplay}?\nIt runs \`whydone hook stop\` when Claude finishes a turn and nudges per your mode.
Required for ask/auto to trigger automatically. Remove anytime: npx whydone uninstall`,
						initialValue: true
					});
					if (clack.isCancel(consent)) {
						clack.cancel("Operation cancelled — nothing was written.");
						process.exit(0);
						return;
					}
					interactiveConsent = consent === true;
				}
				clack.outro("Setting up…");
			} else {
				mode = existingConfig?.mode ?? "manual";
				explicit = false;
			}
			const useLocal = args.local || wizardLocal;
			const installHook = mode !== "manual" && args.hook !== false && (interactive ? interactiveConsent : explicit);
			if (args["dry-run"]) {
				process.stdout.write(bold("whydone init dry-run plan:\n"));
				process.stdout.write(green("  [create]") + " " + dim(path.relative(cwd, journalDir) + "/\n"));
				process.stdout.write(green("  [create]") + " " + dim(indexPath + " (seed, skipped if present)\n"));
				process.stdout.write(green("  [create]") + " " + dim(path.join(path.relative(cwd, skillsDir), "log", "SKILL.md") + "\n"));
				process.stdout.write(green("  [create]") + " " + dim(path.join(path.relative(cwd, skillsDir), "recall", "SKILL.md") + "\n"));
				process.stdout.write(green("  [create/update]") + " " + dim("CLAUDE.md (marker block)\n"));
				process.stdout.write(green("  [create]") + " " + dim(path.relative(cwd, lockPath) + "\n"));
				process.stdout.write(green("  [create]") + " " + dim(`${JOURNAL_DIR}/config.json (mode: ${mode}${languageSuffix})\n`));
				process.stdout.write(green("  [create]") + " " + dim(`${JOURNAL_DIR}/.cache/.gitignore\n`));
				if (installHook) process.stdout.write(green("  [create/update]") + " " + dim(`${settingsDisplay} (Stop hook)\n`));
				else {
					const why = mode === "manual" ? "manual mode" : args.hook === false ? "--no-hook" : "non-interactive run";
					process.stdout.write(green("  [skip]") + " " + dim(`Stop hook (${why})\n`));
				}
				if (args.local) process.stdout.write(green("  [update]") + " " + dim(`.git/info/exclude (hide ${JOURNAL_DIR}/, storage: local)\n`));
				return;
			}
			if (useLocal && isTracked(cwd, ".whydone")) {
				process.stderr.write(`error: ${JOURNAL_DIR}/ is already tracked by git — --local cannot hide tracked files.\n  Untrack it first (deliberate, history-visible; committed entries stay in git history):
    git rm -r --cached ${JOURNAL_DIR} && git commit -m "untrack journal"\n  then re-run with --local, or use \`whydone hide\`.
`);
				process.exit(1);
				return;
			}
			await mkdir(journalDir, { recursive: true });
			try {
				await writeFile(path.join(journalDir, "INDEX.md"), buildIndexContent([]), {
					encoding: "utf-8",
					flag: "wx"
				});
			} catch (err) {
				if (err.code !== "EEXIST") throw err;
			}
			const result = await copySkills(TEMPLATES_DIR$1, skillsDir, { force: args.force });
			await patchClaudeMd(claudeMdPath, indexPath, scope);
			const configInvalid = existsSync(configPath) && existingConfig === null;
			if (!existsSync(configPath) || configInvalid || explicit || useLocal || args.language !== void 0) {
				await writeConfigMode(journalDir, mode, useLocal ? "local" : wizardAskedStorage ? "committed" : void 0, args.language);
				if (configInvalid) process.stderr.write(yellow("warn") + `: ${JOURNAL_DIR}/config.json was invalid — rewritten with mode ${mode}\n`);
			}
			await mkdir(path.join(journalDir, ".cache"), { recursive: true });
			try {
				await writeFile(path.join(journalDir, ".cache", ".gitignore"), "*\n", {
					encoding: "utf-8",
					flag: "wx"
				});
			} catch (err) {
				if (err.code !== "EEXIST") throw err;
			}
			let localNoGit = false;
			let localClaudeMdVisible = false;
			if (useLocal) {
				const toExclude = [`${JOURNAL_DIR}/`];
				const claudeMdTracked = !args.global && isTracked(cwd, "CLAUDE.md");
				if (!args.global && !claudeMdTracked) toExclude.push("CLAUDE.md");
				const wrote = await ensureExcluded(cwd, toExclude);
				localNoGit = !wrote;
				localClaudeMdVisible = wrote && claudeMdTracked;
				if (localClaudeMdVisible) process.stderr.write(yellow("warn") + ": CLAUDE.md is tracked by git — the whydone marker block in it shows up in git status.\n      Do not commit that change (`git restore CLAUDE.md` removes it; `whydone hide`/`publish` manage it).\n");
				if (!args.quiet) process.stderr.write(yellow("note") + ": the npm channel itself leaves whydone traces in the repo (package.json devDependency,\n      .claude/skills, lock-file). For a fully traceless setup use the plugin channel with\n      `init --journal-only --local`.\n");
			}
			let hookOutcome;
			if (installHook) {
				await mkdir(targetBase, { recursive: true });
				await writeFile(launcherPath, buildLauncherSource(), "utf-8");
				const installResult = await installStopHook(settingsPath, launcherPath);
				if (installResult === "invalid-json") {
					hookOutcome = "invalid-json";
					process.stderr.write(yellow("warn") + `: ${settingsDisplay} is not valid JSON — hook not installed; fix the file and re-run npx whydone init\n`);
				} else if (installResult === "conflict") {
					hookOutcome = "conflict";
					process.stderr.write(yellow("warn") + `: ${settingsDisplay} changed while whydone was editing it — hook not (re)installed, re-run the command\n`);
				} else hookOutcome = "installed";
			} else if (mode === "manual") hookOutcome = "manual-mode";
			else if (args.hook === false) hookOutcome = "no-hook";
			else hookOutcome = "not-installed";
			await writeLockFile(lockPath, {
				lockVersion: 2,
				version: PKG_VERSION$1,
				scope,
				skillsDir: "skills",
				skills: [...result.copied, ...result.skipped].map((f) => toPosixPath(path.join("skills", f))).sort(),
				claudeMdPatched: true,
				claudeMdPath: toPosixPath(path.relative(targetBase, claudeMdPath))
			});
			if (!args.quiet) {
				const installed = result.copied.length;
				const skipped = result.skipped.length;
				let hookLine;
				switch (hookOutcome) {
					case "installed":
						hookLine = `installed → ${settingsDisplay} (local to this machine)`;
						break;
					case "manual-mode":
						hookLine = "not installed (manual mode)";
						break;
					case "no-hook":
						hookLine = "not installed (--no-hook)";
						break;
					case "invalid-json":
						hookLine = "not installed — settings file invalid (see warning)";
						break;
					case "conflict":
						hookLine = "not installed — settings file changed during edit (see warning; re-run npx whydone init)";
						break;
					case "not-installed":
						hookLine = "not installed — ask/auto will only trigger when you invoke /log yourself. Re-run npx whydone init to add it.";
						break;
				}
				const claudeMdDisplay = args.global ? "~/.claude/CLAUDE.md" : "CLAUDE.md";
				const effLocal = useLocal || existingConfig?.storage === "local";
				const fullModeLine = effLocal ? MODE_LINE_LOCAL[mode] : MODE_LINE[mode];
				const effLanguage = args.language ?? existingConfig?.language;
				const languageLine = effLanguage !== void 0 ? `  Language:         ${effLanguage} (entry prose; .whydone/config.json)\n` : "";
				const storageLine = effLocal ? localNoGit ? "  Storage:          local (no git repo here — nothing to exclude)\n" : "  Storage:          LOCAL-ONLY — .whydone/ hidden via .git/info/exclude; no backup. `whydone publish` reverses.\n" : "";
				const step3 = effLocal ? "  3. The journal is local-only — nothing of it to commit. Commit the tooling if you want:\n       git add .claude/skills .claude/whydone.lock.json\n" : "  3. Commit the shared parts:\n       git add .whydone .claude/skills .claude/whydone.lock.json CLAUDE.md\n     (.claude/settings.local.json stays local — teammates run `npx whydone init` once after cloning.)\n";
				process.stdout.write(bold("whydone init") + ` complete
  Skills installed: ${green(String(installed))}, skipped: ${dim(String(skipped))}\n  Journal dir:      ${dim(path.relative(cwd, journalDir) + "/")}\n  Lock-file:        ${dim(path.relative(cwd, lockPath))}\n  Mode:             ${fullModeLine}\n` + languageLine + storageLine + `  Stop hook:        ${hookLine}\n
Next steps:
  1. ${claudeMdDisplay} was updated — accept the workspace-trust prompt next session so project skills load.\n  2. Start a NEW Claude Code session: skills, hooks, and CLAUDE.md are read at session start.
` + step3 + "  4. Finish any task, then run /log — in ask or auto mode whydone will also offer it by itself.\n\nRemove everything: npx whydone uninstall   (add --purge to also delete .whydone/)\n");
			}
		}
	});
}));
//#endregion
//#region src/commands/validate.ts
var validate_exports = /* @__PURE__ */ __exportAll({
	default: () => validate_default,
	strictCheck: () => strictCheck
});
/**
* Strict schema check for a single parsed entry.
*
* Pure function — no filesystem access. The caller passes:
*   - entry: ParsedEntry from parseEntry() (upstream plan 02-02)
*   - stem: the filename stem (without .md)
*   - existingIds: Set of all entry stems in the changelog dir
*
* Returns { errors, warnings } where:
*   - errors cause a non-zero exit code
*   - warnings are informational (zero exit)
*/
function strictCheck(entry, stem, existingIds) {
	const errors = [];
	const warnings = [];
	if (entry._parseError) {
		errors.push({
			code: "PARSE_ERROR",
			message: `YAML parse error in ${entry._file} — fix frontmatter syntax`
		});
		return {
			errors,
			warnings
		};
	}
	if (entry.schema === void 0 || entry.schema === null) errors.push({
		code: "MISSING_FIELD",
		field: "schema",
		message: "Required field \"schema\" is missing"
	});
	else if (entry.schema !== 1) errors.push({
		code: "WRONG_SCHEMA",
		field: "schema",
		message: `schema must be the bare integer 1, got ${JSON.stringify(entry.schema)}`
	});
	if (!entry.id) errors.push({
		code: "MISSING_FIELD",
		field: "id",
		message: "Required field \"id\" is missing"
	});
	else if (entry.id !== stem) errors.push({
		code: "ID_STEM_MISMATCH",
		field: "id",
		message: `id "${entry.id}" does not match filename stem "${stem}"`
	});
	if (!entry.date) errors.push({
		code: "MISSING_FIELD",
		field: "date",
		message: "Required field \"date\" is missing"
	});
	else if (!DATE_RE.test(entry.date)) errors.push({
		code: "BAD_DATE",
		field: "date",
		message: `date "${entry.date}" must be in YYYY-MM-DD format`
	});
	if (typeof entry.id === "string" && entry.id && entry.date && DATE_RE.test(entry.date)) {
		const expectedPrefix = entry.date.replace(/-/g, "") + "-";
		if (!entry.id.startsWith(expectedPrefix)) errors.push({
			code: "ID_DATE_MISMATCH",
			field: "id",
			message: `id "${entry.id}" must start with "${expectedPrefix}" (the digits of date "${entry.date}")`
		});
	}
	if (!entry.slug) errors.push({
		code: "MISSING_FIELD",
		field: "slug",
		message: "Required field \"slug\" is missing"
	});
	else {
		if (!SLUG_RE.test(entry.slug)) errors.push({
			code: "BAD_SLUG",
			field: "slug",
			message: `slug "${entry.slug}" must match /^[a-z0-9-]+$/`
		});
		if (typeof entry.id === "string" && entry.id) {
			const expectedSlug = entry.id.slice(9);
			if (entry.slug !== expectedSlug) errors.push({
				code: "SLUG_MISMATCH",
				field: "slug",
				message: `slug "${entry.slug}" does not match id.slice(9) "${expectedSlug}"`
			});
		}
	}
	if (!entry.task) errors.push({
		code: "MISSING_FIELD",
		field: "task",
		message: "Required field \"task\" is missing"
	});
	if (entry.status !== void 0 && entry.status !== null && entry.status !== "") {
		if (!VALID_STATUSES.has(entry.status)) errors.push({
			code: "BAD_STATUS",
			field: "status",
			message: `status "${entry.status}" is not in enum [done, wip, blocked]`
		});
	}
	for (const field of [
		"tags",
		"files",
		"links"
	]) if (entry._scalarFields?.includes(field)) errors.push({
		code: "BAD_TYPE",
		field,
		message: `${field} must be a YAML array [...] not a bare scalar — see SCHEMA.md §Frontmatter Fields`
	});
	for (const supId of entry.supersedes ?? []) if (!existingIds.has(supId)) warnings.push({
		code: "SUPERSEDES_MISSING",
		field: "supersedes",
		message: `supersedes "${supId}" not found on disk`
	});
	return {
		errors,
		warnings
	};
}
var import_picocolors$4, VALID_STATUSES, DATE_RE, SLUG_RE, validate_default;
var init_validate = __esmMin((() => {
	init_dist$6();
	import_picocolors$4 = /* @__PURE__ */ __toESM(require_picocolors(), 1);
	init_constants();
	init_glob_entries();
	VALID_STATUSES = new Set([
		"done",
		"wip",
		"blocked"
	]);
	DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
	SLUG_RE = /^[a-z0-9-]+$/;
	validate_default = defineCommand({
		meta: {
			name: "validate",
			description: "Validate .whydone entries against the whydone schema (CI-safe, no LLM)"
		},
		args: {
			path: {
				type: "positional",
				description: "Path to the .whydone directory (default: .whydone)",
				required: false,
				default: JOURNAL_DIR
			},
			json: {
				type: "boolean",
				description: "Output JSON validation report to stdout",
				default: false
			},
			"dry-run": {
				type: "boolean",
				description: "Alias for validate — runs checks but does not write files",
				default: false
			},
			quiet: {
				type: "boolean",
				description: "Suppress non-error output",
				default: false
			},
			"no-color": {
				type: "boolean",
				description: "Disable ANSI color output",
				default: false
			}
		},
		async run({ args }) {
			const useColor = !args["no-color"];
			const red = (s) => useColor ? import_picocolors$4.default.red(s) : s;
			const yellow = (s) => useColor ? import_picocolors$4.default.yellow(s) : s;
			const green = (s) => useColor ? import_picocolors$4.default.green(s) : s;
			const dim = (s) => useColor ? import_picocolors$4.default.dim(s) : s;
			const bold = (s) => useColor ? import_picocolors$4.default.bold(s) : s;
			const changelogDir = path.resolve(process.cwd(), args.path ?? ".whydone");
			const projectRoot = process.cwd();
			if (changelogDir !== projectRoot && !changelogDir.startsWith(projectRoot + path.sep)) {
				process.stderr.write(red("error") + ": path traversal detected — resolved changelogDir is outside project root\n");
				process.exit(1);
			}
			const entries = await globEntries(changelogDir);
			const existingIds = new Set(entries.map((e) => e._stem));
			const results = entries.map((e) => ({
				file: e._file,
				stem: e._stem,
				...strictCheck(e, e._stem, existingIds)
			}));
			const totalErrors = results.reduce((n, r) => n + r.errors.length, 0);
			const totalWarnings = results.reduce((n, r) => n + r.warnings.length, 0);
			const report = {
				results,
				totalErrors,
				totalWarnings
			};
			if (args.json) {
				process.stdout.write(JSON.stringify(report, null, 2) + "\n");
				process.exitCode = totalErrors > 0 ? 1 : 0;
				return;
			}
			if (entries.length === 0) {
				if (!args.quiet) {
					process.stdout.write(dim(`No entries found in ${path.relative(process.cwd(), changelogDir)}\n`));
					process.stdout.write(green("0 entries") + ", 0 errors, 0 warnings\n");
				}
				process.exitCode = 0;
				return;
			}
			for (const result of results) {
				if (!(result.errors.length > 0 || result.warnings.length > 0)) continue;
				const relFile = path.relative(process.cwd(), result.file);
				process.stdout.write(bold(relFile) + "\n");
				for (const err of result.errors) {
					const field = err.field ? ` [${err.field}]` : "";
					process.stdout.write(`  ${red("error")}${field} ${err.code}: ${err.message}\n`);
				}
				for (const warn of result.warnings) {
					const field = warn.field ? ` [${warn.field}]` : "";
					process.stdout.write(`  ${yellow("warn")}${field} ${warn.code}: ${warn.message}\n`);
				}
			}
			const statusColor = totalErrors > 0 ? red : totalWarnings > 0 ? yellow : green;
			const summary = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}, ${totalErrors} error${totalErrors !== 1 ? "s" : ""}, ${totalWarnings} warning${totalWarnings !== 1 ? "s" : ""}`;
			if (!args.quiet || totalErrors > 0) process.stdout.write(statusColor(summary) + "\n");
			process.exitCode = totalErrors > 0 ? 1 : 0;
		}
	});
}));
//#endregion
//#region src/lib/rank-entries.ts
/**
* Tokenize a free-text query: lowercase, split on non-(letter/digit/hyphen)
* (Unicode-aware — Cyrillic survives), strip edge hyphens, drop tokens
* shorter than 2 chars, drop stopwords, dedupe, cap at 20 tokens.
*/
function tokenizeQuery(q) {
	const rawTokens = q.toLowerCase().split(/[^\p{L}\p{N}-]+/u);
	const seen = /* @__PURE__ */ new Set();
	const tokens = [];
	for (const rawToken of rawTokens) {
		const token = rawToken.replace(/^-+|-+$/g, "");
		if (token.length < MIN_TOKEN_LENGTH) continue;
		if (STOPWORD_SET.has(token)) continue;
		if (seen.has(token)) continue;
		seen.add(token);
		tokens.push(token);
		if (tokens.length >= MAX_QUERY_TOKENS) break;
	}
	return tokens;
}
/**
* Normalize a file path for matching: `\` → `/` (Windows-pasted paths),
* collapse duplicate slashes, strip leading `./`.
* Applied to BOTH query files and entry files.
*/
function normalizePath(p) {
	let normalized = p.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
	while (normalized.startsWith("./")) normalized = normalized.slice(2);
	return normalized;
}
/**
* Posix dirname of an already-normalized path. Root-level files → ".".
*/
function posixDirname(p) {
	const idx = p.lastIndexOf("/");
	return idx === -1 ? "." : p.slice(0, idx);
}
/**
* Count unchecked `- [ ]` lines between the verbatim heading
* `## Verify-later / follow-ups` and the next `## ` heading (or EOF).
* A section whose items are all checked counts 0.
*
* Code-fence aware: lines inside ``` / ~~~ fences are literal example text —
* a fenced copy of the heading never opens the section, a fenced `## ` line
* never terminates it, and fenced `- [ ]` items are never counted. (Entries
* documenting markdown tooling legitimately quote the entry format itself.)
*/
function countOpenFollowUps(body) {
	const lines = body.split("\n");
	let inSection = false;
	let inFence = false;
	let count = 0;
	for (const line of lines) {
		const trimmed = line.trimEnd();
		if (FENCE_RE.test(trimmed)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		if (!inSection) {
			if (trimmed === "## Verify-later / follow-ups") inSection = true;
			continue;
		}
		if (trimmed.startsWith("## ")) break;
		if (/^\s*-\s\[ \]/.test(line)) count++;
	}
	return count;
}
/**
* Resolve the effective result limit: --all → unbounded; otherwise
* clamp the numeric value into [1, 20]; non-numeric → default 5.
*/
function resolveLimit(value, all) {
	if (all) return Number.POSITIVE_INFINITY;
	const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
	if (Number.isNaN(n)) return 5;
	return Math.min(20, Math.max(1, n));
}
/** Round to 4 decimals for output. */
function round4(x) {
	return Math.round(x * 1e4) / 1e4;
}
/**
* fileOverlap = (Σ over qf of match(qf)) / |Q.files|:
*   1.0 exact normalized-path match; else 0.5 shared dirname (repo root
*   "." excluded from partial credit); else 0. Component is 0 with no files.
*/
function fileOverlap(entry, queryFiles) {
	if (queryFiles.length === 0) return 0;
	const entryFiles = entry.files.map(normalizePath);
	let sum = 0;
	for (const qf of queryFiles) {
		const nqf = normalizePath(qf);
		if (entryFiles.some((f) => f === nqf)) {
			sum += 1;
			continue;
		}
		const qfDir = posixDirname(nqf);
		if (qfDir !== "." && entryFiles.some((f) => posixDirname(f) === qfDir)) sum += .5;
	}
	return sum / queryFiles.length;
}
/**
* tagMatch = |lowercase(Q.tags) ∩ lowercase(e.tags)| / |Q.tags|.
* Both sides lowercased so `#Auth` matches an `auth` tag. 0 with no tags.
*/
function tagMatch(entry, queryTags) {
	if (queryTags.length === 0) return 0;
	const entryTags = new Set(entry.tags.map((t) => t.toLowerCase()));
	return queryTags.filter((t) => entryTags.has(t.toLowerCase())).length / queryTags.length;
}
/**
* keywordScore = (Σ over term of hit(term)) / |Q.terms|, where hit(term)
* takes the MAXIMUM matching tier: 1.0 substring of task/slug/any tag;
* else 0.5 substring of any files path; else 0.5 substring of the body;
* else 0. All comparisons case-insensitive. 0 with no terms.
*/
function keywordScore(entry, terms) {
	if (terms.length === 0) return 0;
	const strongHaystacks = [
		entry.task,
		entry.slug,
		...entry.tags
	].map((s) => s.toLowerCase());
	const fileHaystacks = entry.files.map((f) => normalizePath(f).toLowerCase());
	const bodyHaystack = (entry.body ?? "").toLowerCase();
	let sum = 0;
	for (const term of terms) if (strongHaystacks.some((h) => h.includes(term))) sum += 1;
	else if (fileHaystacks.some((h) => h.includes(term))) sum += .5;
	else if (bodyHaystack.includes(term)) sum += .5;
	return sum / terms.length;
}
/**
* Total-order comparator for recency ranking and tie-breaking:
* date desc (string compare; empty date sorts last) → id desc.
*/
function compareDateIdDesc(a, b) {
	if (a.date !== b.date) return a.date > b.date ? -1 : 1;
	if (a.id !== b.id) return a.id > b.id ? -1 : 1;
	return 0;
}
/**
* Score a single candidate against the query.
*
* recency is corpus-dependent (rank-based), so it is computed by
* rankEntries() and injected here:
*   signal = 3*fileOverlap + 2*tagMatch + 2*keywordScore
*   score  = (signal + 1*recency) * (superseded ? 0.25 : 1)
*/
function scoreEntry(e, q, recency = 0) {
	const files = fileOverlap(e, q.files);
	const tags = tagMatch(e, q.tags);
	const keywords = keywordScore(e, q.terms);
	const signal = RECALL_WEIGHTS.files * files + RECALL_WEIGHTS.tags * tags + RECALL_WEIGHTS.keywords * keywords;
	const multiplier = e._supersededBy.length > 0 ? RECALL_WEIGHTS.supersededMultiplier : 1;
	const score = (signal + RECALL_WEIGHTS.recency * recency) * multiplier;
	return {
		entry: e,
		score: round4(score),
		rawScore: score,
		signal,
		components: {
			files: round4(files),
			tags: round4(tags),
			keywords: round4(keywords),
			recency: round4(recency)
		}
	};
}
/**
* Rank candidates against the query.
*
* Recency: candidates ranked by (date desc, id desc); rank is 0-based
* (newest = 0); recency = (N - rank) / N — newest scores exactly 1.0,
* oldest 1/N, N=1 ⇒ 1.0.
*
* Eligibility gate: when ANY filter was given, only entries with
* signal > 0 qualify — recency alone never does. With no filters, every
* candidate is eligible (pure-recency "last N things done"). Pass
* hasFilters explicitly when the caller knows a filter FLAG was given
* even though processing emptied it (e.g. --query of pure stopwords →
* terms=[]): the gate must still apply so eligible drops to 0 and the
* consumer can disclose its fallback, instead of silently presenting
* recency-only results as ranked matches.
*
* Sort: raw (unrounded) score desc → date desc (empty last) → id desc.
* No padding below limit — counts are reported instead.
*/
function rankEntries(candidates, q, limit, hasFilters) {
	const total = candidates.length;
	const byRecency = [...candidates].sort(compareDateIdDesc);
	const rankOf = /* @__PURE__ */ new Map();
	byRecency.forEach((c, i) => rankOf.set(c, i));
	const scored = candidates.map((c) => scoreEntry(c, q, (total - rankOf.get(c)) / total));
	const eligible = hasFilters ?? (q.terms.length > 0 || q.files.length > 0 || q.tags.length > 0) ? scored.filter((s) => s.signal > 0) : scored;
	const sorted = [...eligible].sort((a, b) => b.rawScore - a.rawScore || compareDateIdDesc(a.entry, b.entry));
	const results = Number.isFinite(limit) ? sorted.slice(0, limit) : sorted;
	return {
		total,
		eligible: eligible.length,
		results
	};
}
var RECALL_WEIGHTS, STOPWORDS, STOPWORD_SET, MIN_TOKEN_LENGTH, MAX_QUERY_TOKENS, FENCE_RE;
var init_rank_entries = __esmMin((() => {
	RECALL_WEIGHTS = {
		files: 3,
		tags: 2,
		keywords: 2,
		recency: 1,
		supersededMultiplier: .25
	};
	STOPWORDS = [
		"the",
		"a",
		"an",
		"and",
		"or",
		"of",
		"to",
		"in",
		"on",
		"for",
		"with",
		"this",
		"that",
		"from",
		"into",
		"is",
		"are",
		"was",
		"be",
		"as",
		"at",
		"by",
		"it",
		"not",
		"fix",
		"add",
		"use",
		"new",
		"make",
		"и",
		"в",
		"на",
		"с",
		"для",
		"что",
		"это",
		"как",
		"по",
		"из",
		"не",
		"у",
		"о",
		"же",
		"бы",
		"был",
		"была"
	];
	STOPWORD_SET = new Set(STOPWORDS);
	MIN_TOKEN_LENGTH = 2;
	MAX_QUERY_TOKENS = 20;
	FENCE_RE = /^\s*(```|~~~)/;
}));
//#endregion
//#region src/commands/recall.ts
var recall_exports = /* @__PURE__ */ __exportAll({
	collectRepeatedFlag: () => collectRepeatedFlag,
	default: () => recall_default,
	executeRecall: () => executeRecall,
	mergeCsvFlag: () => mergeCsvFlag
});
/**
* Collect every occurrence of a repeated `--name value` / `--name=value`
* flag from rawArgs. citty 0.2.x wraps node:util parseArgs WITHOUT
* multiple:true, so repeated string flags are last-wins in `args` — the
* documented repeatable semantics (04-DESIGN.md §1.4) require scanning
* rawArgs ourselves. Returns [] when rawArgs is unavailable (callers
* then fall back to the parsed single value).
*/
function collectRepeatedFlag(rawArgs, name) {
	if (!rawArgs) return [];
	const values = [];
	const eq = `--${name}=`;
	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i];
		if (arg === `--${name}`) {
			const next = rawArgs[i + 1];
			if (next !== void 0 && !next.startsWith("--")) {
				values.push(next);
				i++;
			}
		} else if (arg.startsWith(eq)) values.push(arg.slice(eq.length));
	}
	return values;
}
/**
* Merge a repeatable CSV flag: each occurrence may itself be a
* comma-separated list; all values are split on commas, transformed
* (normalize/lowercase), unioned, and deduped (04-DESIGN.md §1.4).
*
* Occurrences come from collectRepeatedFlag() (string[]) or from the
* citty-parsed single value (string) — both are handled.
*/
function mergeCsvFlag(raw, transform) {
	const occurrences = Array.isArray(raw) ? raw : raw === void 0 || raw === null ? [] : [raw];
	const seen = /* @__PURE__ */ new Set();
	const merged = [];
	for (const occurrence of occurrences) for (const piece of String(occurrence).split(",")) {
		const value = transform(piece.trim());
		if (!value || seen.has(value)) continue;
		seen.add(value);
		merged.push(value);
	}
	return merged;
}
/**
* Full recall pipeline: fresh glob → buildManifestEntries (in-memory,
* _supersededBy computed) → read bodies of non-parse-error entries
* (keyword scan + openFollowUps counted here, never in context) →
* rankEntries → report. Never writes anything.
*/
async function executeRecall(changelogDir, opts) {
	const entries = await globEntries(changelogDir);
	const manifestEntries = buildManifestEntries(entries);
	const idToFile = /* @__PURE__ */ new Map();
	for (const e of entries) idToFile.set(String(e.id ?? e._stem), e._file);
	const parseErrors = manifestEntries.filter((me) => me._parseError).map((me) => me.id);
	const candidates = await Promise.all(manifestEntries.filter((me) => !me._parseError).map(async (me) => {
		const file = idToFile.get(me.id);
		let body = "";
		if (file) {
			const raw = await readFile(file, "utf-8");
			try {
				body = splitFrontmatter(raw).content;
			} catch {
				body = raw;
			}
		}
		return {
			...me,
			body,
			openFollowUps: countOpenFollowUps(body)
		};
	}));
	const query = {
		terms: opts.query ? tokenizeQuery(opts.query) : [],
		files: opts.files,
		tags: opts.tags
	};
	const hasFilters = opts.query !== void 0 && opts.query.trim() !== "" || opts.files.length > 0 || opts.tags.length > 0;
	const { eligible, results } = rankEntries(candidates, query, opts.limit, hasFilters);
	return {
		total: manifestEntries.length,
		eligible,
		returned: results.length,
		query,
		results: results.map((s) => toResultItem(s, idToFile)),
		parseErrors
	};
}
/** Convert a ScoredEntry to the public result row shape. */
function toResultItem(s, idToFile) {
	const e = s.entry;
	const absFile = idToFile.get(e.id);
	const relFile = absFile ? path.relative(process.cwd(), absFile) : "";
	return {
		id: e.id,
		file: relFile,
		date: e.date,
		task: e.task,
		status: e.status,
		tags: e.tags,
		files: e.files,
		score: s.score,
		components: s.components,
		superseded: e._supersededBy.length > 0,
		supersededBy: e._supersededBy,
		hasVerifyLater: e.openFollowUps > 0,
		openFollowUps: e.openFollowUps
	};
}
var recall_default;
var init_recall = __esmMin((() => {
	init_dist$6();
	init_constants();
	init_glob_entries();
	init_frontmatter();
	init_build_index();
	init_rank_entries();
	recall_default = defineCommand({
		meta: {
			name: "recall",
			description: "Rank .whydone entries against a query — deterministic, read-only, no LLM"
		},
		args: {
			path: {
				type: "positional",
				description: "Path to the .whydone directory (default: .whydone)",
				required: false,
				default: JOURNAL_DIR
			},
			query: {
				type: "string",
				description: "Free-text query (tokenized: lowercase, stopwords dropped)"
			},
			files: {
				type: "string",
				description: "File paths to match (repeatable; each value may be a comma-separated list)"
			},
			tags: {
				type: "string",
				description: "Tags to match (repeatable; comma-separated; lowercased)"
			},
			limit: {
				type: "string",
				description: "Maximum results to return (default 5, clamped 1..20)",
				default: "5"
			},
			all: {
				type: "boolean",
				description: "Return all eligible results (no limit)",
				default: false
			},
			json: {
				type: "boolean",
				description: "Output the full recall report as JSON",
				default: false
			},
			quiet: {
				type: "boolean",
				description: "Suppress non-error output",
				default: false
			},
			"no-color": {
				type: "boolean",
				description: "Disable ANSI color output",
				default: false
			},
			"dry-run": {
				type: "boolean",
				description: "No-op alias — recall never writes anything",
				default: false
			}
		},
		async run({ args, rawArgs }) {
			const changelogDir = path.resolve(process.cwd(), args.path ?? ".whydone");
			const projectRoot = process.cwd();
			if (changelogDir !== projectRoot && !changelogDir.startsWith(projectRoot + path.sep)) {
				process.stderr.write(`error: path traversal detected — resolved changelogDir is outside project root\n`);
				process.exit(1);
			}
			const filesOccurrences = collectRepeatedFlag(rawArgs, "files");
			const tagsOccurrences = collectRepeatedFlag(rawArgs, "tags");
			const report = await executeRecall(changelogDir, {
				query: typeof args.query === "string" ? args.query : void 0,
				files: mergeCsvFlag(filesOccurrences.length > 0 ? filesOccurrences : args.files, normalizePath),
				tags: mergeCsvFlag(tagsOccurrences.length > 0 ? tagsOccurrences : args.tags, (s) => s.toLowerCase()),
				limit: resolveLimit(args.limit, args.all === true)
			});
			if (args.json) {
				process.stdout.write(JSON.stringify(report, null, 2) + "\n");
				return;
			}
			if (report.total === 0 && report.parseErrors.length === 0) {
				process.stderr.write(`No entries found in ${path.relative(process.cwd(), changelogDir)}\n`);
				return;
			}
			if (!args.quiet) {
				report.results.forEach((r, i) => {
					const supersededNote = r.superseded ? `  (superseded->${r.supersededBy.join(",")})` : "";
					const followUpsNote = r.openFollowUps > 0 ? `  (${r.openFollowUps} open follow-up${r.openFollowUps === 1 ? "" : "s"})` : "";
					process.stdout.write(`${i + 1}. ${r.file}  ${r.score}  [${r.status}]  ${r.task}${supersededNote}${followUpsNote}\n`);
				});
				process.stdout.write(`${report.returned}/${report.eligible} of ${report.total}; ${report.parseErrors.length} unreadable\n`);
			}
		}
	});
}));
//#endregion
//#region src/commands/update.ts
var update_exports = /* @__PURE__ */ __exportAll({ default: () => update_default });
var import_picocolors$3, __dirname$1, PKG_ROOT, TEMPLATES_DIR, PKG_VERSION, update_default;
var init_update = __esmMin((() => {
	init_dist$6();
	import_picocolors$3 = /* @__PURE__ */ __toESM(require_picocolors(), 1);
	init_copy_skills();
	init_lock_file();
	init_settings_hooks();
	__dirname$1 = path.dirname(fileURLToPath(import.meta.url));
	PKG_ROOT = path.basename(__dirname$1) === "dist" || path.basename(__dirname$1) === "cli" ? path.resolve(__dirname$1, "..") : path.resolve(__dirname$1, "..", "..");
	TEMPLATES_DIR = path.join(PKG_ROOT, "templates", "skills");
	PKG_VERSION = createRequire(import.meta.url)(path.join(PKG_ROOT, "package.json")).version;
	update_default = defineCommand({
		meta: {
			name: "update",
			description: "Re-install skills from current package (always force-overwrites existing files)"
		},
		args: {
			"dry-run": {
				type: "boolean",
				description: "Print update plan without writing any files",
				default: false
			},
			quiet: {
				type: "boolean",
				description: "Suppress non-error output",
				default: false
			},
			"no-color": {
				type: "boolean",
				description: "Disable ANSI color output",
				default: false
			}
		},
		async run({ args }) {
			const useColor = !args["no-color"];
			const red = (s) => useColor ? import_picocolors$3.default.red(s) : s;
			const green = (s) => useColor ? import_picocolors$3.default.green(s) : s;
			const dim = (s) => useColor ? import_picocolors$3.default.dim(s) : s;
			const bold = (s) => useColor ? import_picocolors$3.default.bold(s) : s;
			const yellow = (s) => useColor ? import_picocolors$3.default.yellow(s) : s;
			const cwd = process.cwd();
			const projectLockPath = path.resolve(cwd, ".claude", "whydone.lock.json");
			const globalLockPath = path.join(homedir(), ".claude", "whydone.lock.json");
			let lockPath = projectLockPath;
			let lock = await readLockFile(lockPath);
			if (lock === null) {
				lock = await readLockFile(globalLockPath);
				if (lock !== null) lockPath = globalLockPath;
			}
			if (lock === null) {
				process.stderr.write(red("error") + ": whydone is not initialized. Run `npx whydone init` first.\n" + dim("  Checked: " + path.relative(cwd, projectLockPath) + "\n") + dim("  Checked: " + globalLockPath + "\n"));
				process.exit(1);
				return;
			}
			if (lock.lockVersion !== 2) {
				process.stderr.write(red("error") + `: lock file was written by an older whydone — delete ${path.relative(cwd, lockPath)} and re-run npx whydone init\n`);
				process.exit(1);
				return;
			}
			const lockDir = path.dirname(lockPath);
			const resolvedSkillsDir = path.resolve(lockDir, lock.skillsDir);
			if (!(resolvedSkillsDir === lockDir || resolvedSkillsDir.startsWith(lockDir + path.sep))) {
				process.stderr.write(red("error") + ": lock-file skillsDir is outside expected scope — aborting for safety\n" + dim("  skillsDir: " + lock.skillsDir + "\n") + dim("  If this is unexpected, delete .claude/whydone.lock.json manually.\n"));
				process.exit(1);
				return;
			}
			const settingsPath = lock.scope === "global" ? path.join(lockDir, "settings.json") : path.join(lockDir, "settings.local.json");
			const launcherPath = path.join(lockDir, LAUNCHER_BASENAME);
			if (args["dry-run"]) {
				process.stdout.write(bold("whydone update dry-run plan:\n"));
				process.stdout.write(yellow("  [would update]") + " " + dim(lock.skillsDir + "/log/SKILL.md\n"));
				process.stdout.write(yellow("  [would update]") + " " + dim(lock.skillsDir + "/recall/SKILL.md\n"));
				if (await hasStopHook(settingsPath)) process.stdout.write(yellow("  [would refresh]") + " " + dim(`Stop hook launcher (${LAUNCHER_BASENAME})\n`));
				process.stdout.write(dim(`  Target: ${resolvedSkillsDir}\n`));
				return;
			}
			const result = await copySkills(TEMPLATES_DIR, resolvedSkillsDir, { force: true });
			let hookRefreshed = false;
			if (await hasStopHook(settingsPath)) {
				await writeFile(launcherPath, buildLauncherSource(), "utf-8");
				const refreshResult = await installStopHook(settingsPath, launcherPath);
				if (refreshResult === "conflict") process.stderr.write(yellow("warn") + `: ${settingsPath} changed while whydone was editing it — hook not (re)installed, re-run the command\n`);
				else if (refreshResult === "installed" || refreshResult === "updated") hookRefreshed = true;
			}
			const allSkillRelPaths = [...result.copied, ...result.skipped].map((f) => `${lock.skillsDir}/${toPosixPath(f)}`).sort();
			const updatedLock = {
				lockVersion: 2,
				version: PKG_VERSION,
				scope: lock.scope,
				skillsDir: lock.skillsDir,
				skills: allSkillRelPaths,
				claudeMdPatched: lock.claudeMdPatched,
				claudeMdPath: lock.claudeMdPath
			};
			await writeLockFile(lockPath, updatedLock);
			if (!args.quiet) {
				const updatedCount = result.copied.length;
				process.stdout.write(bold("whydone update") + ` complete
  Updated ${green(String(updatedCount))} skill file(s) to version ${dim(PKG_VERSION)}\n  Skills dir: ${dim(lock.skillsDir)}\n` + (hookRefreshed ? `  Stop hook launcher refreshed\n` : ""));
			}
		}
	});
}));
//#endregion
//#region src/commands/uninstall.ts
var uninstall_exports = /* @__PURE__ */ __exportAll({ default: () => uninstall_default });
var import_picocolors$2, uninstall_default;
var init_uninstall = __esmMin((() => {
	init_dist$6();
	import_picocolors$2 = /* @__PURE__ */ __toESM(require_picocolors(), 1);
	init_constants();
	init_git_exclude();
	init_lock_file();
	init_marker_block();
	init_settings_hooks();
	uninstall_default = defineCommand({
		meta: {
			name: "uninstall",
			description: "Remove whydone skills, Stop hook, CLAUDE.md marker block, and lock-file"
		},
		args: {
			purge: {
				type: "boolean",
				description: "Also remove .whydone/ journal directory",
				default: false
			},
			global: {
				type: "boolean",
				description: "Uninstall the ~/.claude/ (global) install instead of the project one",
				default: false
			},
			"dry-run": {
				type: "boolean",
				description: "Print removal plan without deleting files",
				default: false
			},
			quiet: {
				type: "boolean",
				description: "Suppress non-error output",
				default: false
			},
			"no-color": {
				type: "boolean",
				description: "Disable ANSI color output",
				default: false
			}
		},
		async run({ args }) {
			const useColor = !args["no-color"];
			const red = (s) => useColor ? import_picocolors$2.default.red(s) : s;
			const dim = (s) => useColor ? import_picocolors$2.default.dim(s) : s;
			const bold = (s) => useColor ? import_picocolors$2.default.bold(s) : s;
			const yellow = (s) => useColor ? import_picocolors$2.default.yellow(s) : s;
			const cwd = process.cwd();
			const targetBase = args.global ? path.join(homedir(), ".claude") : path.resolve(cwd, ".claude");
			const settingsPath = args.global ? path.join(targetBase, "settings.json") : path.join(targetBase, "settings.local.json");
			const settingsDisplay = args.global ? "~/.claude/settings.json" : ".claude/settings.local.json";
			const launcherPath = path.join(targetBase, LAUNCHER_BASENAME);
			const lockPath = path.join(targetBase, "whydone.lock.json");
			if (args["dry-run"]) {
				const lock = await readLockFile(lockPath);
				process.stdout.write(bold("whydone uninstall dry-run plan:\n"));
				if (await hasStopHook(settingsPath)) process.stdout.write(yellow("  [remove]") + " " + dim(`Stop hook (${settingsDisplay})\n`));
				if (existsSync(launcherPath)) process.stdout.write(yellow("  [remove]") + " " + dim(`${LAUNCHER_BASENAME}\n`));
				if (lock === null) {
					process.stderr.write(red("error") + ": whydone is not installed (lock-file not found)\n" + dim("  Checked: " + lockPath + "\n") + dim("  Run `whydone init` to install.\n"));
					process.exit(1);
					return;
				}
				for (const relPath of lock.skills) process.stdout.write(yellow("  [remove]") + " " + dim(relPath + "\n"));
				process.stdout.write(yellow("  [remove]") + " " + dim("CLAUDE.md marker block\n"));
				process.stdout.write(yellow("  [remove]") + " " + dim(path.relative(cwd, lockPath) + "\n"));
				if (args.purge) process.stdout.write(yellow("  [remove]") + " " + dim(JOURNAL_DIR + "/ (--purge)\n"));
				return;
			}
			const launcherExisted = existsSync(launcherPath);
			const hookResult = await removeStopHook(settingsPath);
			if (hookResult === "conflict") process.stderr.write(yellow("warn") + `: ${settingsDisplay} changed while whydone was editing it — hook not removed, re-run the command\n`);
			else if (hookResult !== "removed" && launcherExisted) process.stderr.write(yellow("warn") + `: no whydone Stop hook found in ${settingsDisplay} — if you customized the hook command, remove it manually\n`);
			if (hookResult !== "conflict") await rm(launcherPath, { force: true });
			const lock = await readLockFile(lockPath);
			if (lock === null) {
				process.stderr.write(red("error") + ": whydone is not installed in this directory (lock-file not found)\n" + dim("  Checked: " + (args.global ? lockPath : path.relative(cwd, lockPath)) + "\n") + (args.global ? "" : dim("  If you installed with --global, run `npx whydone uninstall --global`.\n")) + dim("  Run `whydone init` to install.\n"));
				process.exit(1);
				return;
			}
			if (lock.lockVersion !== 2) {
				process.stderr.write(red("error") + `: lock file was written by an older whydone — delete ${path.relative(cwd, lockPath)} and re-run npx whydone init\n`);
				process.exit(1);
				return;
			}
			const lockDir = path.dirname(lockPath);
			for (const relSkillPath of lock.skills) {
				const absPath = path.resolve(lockDir, relSkillPath);
				if (!(absPath === lockDir || absPath.startsWith(lockDir + path.sep))) {
					process.stderr.write(red("error") + ": lock-file contains a path outside expected scope — aborting for safety\n" + dim("  Suspicious path: " + relSkillPath + "\n") + dim("  If this is unexpected, delete .claude/whydone.lock.json manually.\n"));
					process.exit(1);
					return;
				}
			}
			const claudeMdPath = path.resolve(lockDir, lock.claudeMdPath);
			if (![lockDir, path.dirname(lockDir)].some((root) => claudeMdPath.startsWith(root + path.sep))) {
				process.stderr.write(red("error") + ": lock-file claudeMdPath is outside expected scope — aborting for safety\n" + dim("  Suspicious path: " + lock.claudeMdPath + "\n"));
				process.exit(1);
				return;
			}
			const journalDir = path.resolve(cwd, JOURNAL_DIR);
			const removedPaths = [];
			for (const relSkillPath of lock.skills) {
				await rm(path.resolve(lockDir, relSkillPath), { force: true });
				removedPaths.push(relSkillPath);
			}
			const parentDirs = new Set(lock.skills.map((p) => path.dirname(path.resolve(lockDir, p))));
			for (const dir of parentDirs) try {
				await rmdir(dir);
			} catch {}
			if (lock.claudeMdPatched) await removeMarkerBlock(claudeMdPath);
			await deleteLockFile(lockPath);
			if (args.purge) {
				await rm(journalDir, {
					recursive: true,
					force: true
				});
				if (listOtherLocalWorktrees(cwd).length === 0) await removeExcluded(cwd, [`${JOURNAL_DIR}/`, "CLAUDE.md"]);
				else if (!args.quiet) process.stderr.write("note: .git/info/exclude entries kept — local journal(s) in other worktree(s) still use them\n");
			}
			if (!args.quiet) process.stdout.write(bold("whydone uninstall") + ` complete
  Removed ${dim(String(removedPaths.length))} skill file(s)\n` + (hookResult === "removed" ? `  Stop hook removed from ${settingsDisplay}\n` : "") + `  CLAUDE.md marker block removed\n` + (args.purge ? `  .whydone/ removed (--purge)\n` : `  .whydone/ preserved\n`));
		}
	});
}));
//#endregion
//#region src/commands/hide.ts
var hide_exports = /* @__PURE__ */ __exportAll({ default: () => hide_default });
var import_picocolors$1, hide_default;
var init_hide = __esmMin((() => {
	init_dist$6();
	import_picocolors$1 = /* @__PURE__ */ __toESM(require_picocolors(), 1);
	init_constants();
	init_config();
	init_git_exclude();
	hide_default = defineCommand({
		meta: {
			name: "hide",
			description: "Make the journal local-only: hide .whydone/ from git via .git/info/exclude"
		},
		args: {
			"dry-run": {
				type: "boolean",
				description: "Print the plan without changing anything",
				default: false
			},
			quiet: {
				type: "boolean",
				description: "Suppress non-error output",
				default: false
			},
			"no-color": {
				type: "boolean",
				description: "Disable ANSI color output",
				default: false
			}
		},
		async run({ args }) {
			const useColor = !args["no-color"];
			const dim = (s) => useColor ? import_picocolors$1.default.dim(s) : s;
			const bold = (s) => useColor ? import_picocolors$1.default.bold(s) : s;
			const yellow = (s) => useColor ? import_picocolors$1.default.yellow(s) : s;
			const cwd = process.cwd();
			const journalDir = path.resolve(cwd, JOURNAL_DIR);
			if (!existsSync(journalDir)) {
				process.stderr.write(`error: no ${JOURNAL_DIR}/ here — run \`whydone init\` first\n`);
				process.exit(1);
				return;
			}
			const noGit = resolveExcludePath(cwd) === null;
			if (!noGit && isTracked(cwd, ".whydone")) {
				process.stderr.write(`error: ${JOURNAL_DIR}/ is already tracked by git — .git/info/exclude cannot hide tracked files.\n  To untrack it first (a deliberate, history-visible step — committed entries stay in git
  history forever, hiding cannot unpublish them):
    git rm -r --cached ${JOURNAL_DIR} && git commit -m "untrack journal"\n  then re-run \`whydone hide\`.
`);
				process.exit(1);
				return;
			}
			const claudeMdTracked = !noGit && isTracked(cwd, "CLAUDE.md");
			const toExclude = [`${JOURNAL_DIR}/`];
			if (!noGit && !claudeMdTracked) toExclude.push("CLAUDE.md");
			if (args["dry-run"]) {
				process.stdout.write(bold("whydone hide dry-run plan:\n"));
				if (noGit) process.stdout.write(dim("  no git repo — only config.json gets storage: local\n"));
				else process.stdout.write(dim(`  [update] .git/info/exclude  (+ ${toExclude.join(", ")})\n`));
				process.stdout.write(dim(`  [update] ${JOURNAL_DIR}/config.json  (storage: local)\n`));
				return;
			}
			if (!noGit) await ensureExcluded(cwd, toExclude);
			const configWasInvalid = existsSync(path.join(journalDir, "config.json")) && await readConfigIfValid(journalDir) === null;
			const { mode } = await readConfig(journalDir);
			await writeConfigMode(journalDir, mode, "local");
			if (configWasInvalid) process.stderr.write(yellow("warn") + `: ${JOURNAL_DIR}/config.json was invalid — rewritten with mode ${mode}\n`);
			if (claudeMdTracked) process.stderr.write(yellow("warn") + ": CLAUDE.md is tracked by git — the whydone marker block in it shows up in git status.\n      Do not commit that change (`git restore CLAUDE.md` removes it).\n");
			if (!args.quiet) process.stdout.write(bold("whydone hide") + " complete — the journal is LOCAL-ONLY now\n" + (noGit ? "  No git repo here: nothing to exclude; storage: local recorded.\n" : `  ${JOURNAL_DIR}/ is hidden via .git/info/exclude — invisible to git status and diffs.\n`) + "  Remember: a local journal has NO backup — this folder is the only copy.\n  Reverse anytime: whydone publish\n");
		}
	});
}));
//#endregion
//#region src/commands/publish.ts
var publish_exports = /* @__PURE__ */ __exportAll({ default: () => publish_default });
var import_picocolors, publish_default;
var init_publish = __esmMin((() => {
	init_dist$6();
	import_picocolors = /* @__PURE__ */ __toESM(require_picocolors(), 1);
	init_constants();
	init_config();
	init_git_exclude();
	init_marker_block();
	init_lock_file();
	publish_default = defineCommand({
		meta: {
			name: "publish",
			description: "Make the journal committed: unhide .whydone/ and point the next git add at it"
		},
		args: {
			"dry-run": {
				type: "boolean",
				description: "Print the plan without changing anything",
				default: false
			},
			quiet: {
				type: "boolean",
				description: "Suppress non-error output",
				default: false
			},
			"no-color": {
				type: "boolean",
				description: "Disable ANSI color output",
				default: false
			}
		},
		async run({ args }) {
			const useColor = !args["no-color"];
			const dim = (s) => useColor ? import_picocolors.default.dim(s) : s;
			const bold = (s) => useColor ? import_picocolors.default.bold(s) : s;
			const cwd = process.cwd();
			const journalDir = path.resolve(cwd, JOURNAL_DIR);
			if (!existsSync(journalDir)) {
				process.stderr.write(`error: no ${JOURNAL_DIR}/ here — run \`whydone init\` first\n`);
				process.exit(1);
				return;
			}
			const siblings = listOtherLocalWorktrees(cwd);
			if (siblings.length > 0) {
				process.stderr.write("error: other worktree(s) of this repo keep a LOCAL journal that shares the same\n  .git/info/exclude entries — publishing here would expose them:\n" + siblings.map((r) => `    ${r}\n`).join("") + "  Run `whydone publish` in those worktrees first (or delete their journals).\n");
				process.exit(1);
				return;
			}
			if (args["dry-run"]) {
				process.stdout.write(bold("whydone publish dry-run plan:\n"));
				process.stdout.write(dim(`  [update] .git/info/exclude  (- ${JOURNAL_DIR}/, - CLAUDE.md)\n`));
				process.stdout.write(dim("  [create/update] CLAUDE.md  (marker block ensured)\n"));
				process.stdout.write(dim(`  [update] ${JOURNAL_DIR}/config.json  (storage: committed)\n`));
				return;
			}
			await removeExcluded(cwd, [`${JOURNAL_DIR}/`, "CLAUDE.md"]);
			const indexPath = toPosixPath(path.relative(cwd, path.join(journalDir, "INDEX.md")));
			await patchClaudeMd(path.resolve(cwd, "CLAUDE.md"), indexPath, "project");
			const configWasInvalid = existsSync(path.join(journalDir, "config.json")) && await readConfigIfValid(journalDir) === null;
			const { mode } = await readConfig(journalDir);
			await writeConfigMode(journalDir, mode, "committed");
			if (configWasInvalid) process.stderr.write(`warn: ${JOURNAL_DIR}/config.json was invalid — rewritten with mode ${mode}\n`);
			if (!args.quiet) process.stdout.write(bold("whydone publish") + ` complete — the journal is COMMITTED-storage now
  ${JOURNAL_DIR}/ and CLAUDE.md are visible to git again.\n  Ship it to the team:
    git add ${JOURNAL_DIR} CLAUDE.md && git commit -m "chore: publish whydone journal"\n`);
		}
	});
}));
//#endregion
//#region src/commands/hook-stop.ts
var hook_stop_exports = /* @__PURE__ */ __exportAll({
	NUDGE_PREFIX: () => NUDGE_PREFIX,
	applyDecision: () => applyDecision,
	buildFingerprint: () => buildFingerprint,
	buildReasonAsk: () => buildReasonAsk,
	buildReasonAuto: () => buildReasonAuto,
	buildSummary: () => buildSummary,
	decideStop: () => decideStop,
	default: () => hook_stop_default
});
/** The <summary>: two integers + fixed literals ONLY (§3.7). */
function buildSummary(commitCount, dirtyCount) {
	return `${commitCount} unlogged commit(s) and ${dirtyCount} changed file(s) since the last journal entry`;
}
/** REASON_ASK (§3.7, exact). */
function buildReasonAsk(summary) {
	return `${NUDGE_PREFIX} — ${summary}. Journal mode is "ask".\nInvoke the "log" skill now (Skill tool). Follow it exactly: draft the entry, show the user
the byte-exact preview, and ask the standard confirm question in the user's language —
never write without their explicit confirmation. If the user declines, accept that and do
not offer again this session. If the remaining work is trivial or purely conversational,
you may instead tell the user in one line that nothing seems worth logging.`;
}
/** REASON_AUTO (§3.7, exact). */
function buildReasonAuto(summary) {
	return `${NUDGE_PREFIX} — ${summary}. Journal mode is "auto" (user-configured in\n.whydone/config.json). Invoke the "log" skill now (Skill tool). Auto mode per the skill's
STEP 7: write the entry and update the index SILENTLY — no preview, no confirmation, no
report, and no closing remark about the journal. It never asks: if this session already
wrote an entry and it is still uncommitted, rewrite that same file; if nothing new happened,
write nothing and say nothing.`;
}
/** sha256(HEAD-sha or 'unborn' + '\n' + sorted dirty lines).slice(0,16) (§3.4 step 9). */
function buildFingerprint(headSha, dirty) {
	const material = (headSha ?? "unborn") + "\n" + [...dirty].sort().join("\n");
	return createHash("sha256").update(material).digest("hex").slice(0, 16);
}
/**
* The decision core — pure function of input + context (§3.4 algorithm).
* Every guard failure ⇒ allow-stop ({ block: false }).
*/
function decideStop(input, ctx) {
	if (input.stopHookActive) return { block: false };
	if (!ctx.journalDirExists) return { block: false };
	if (ctx.mode === "manual") return { block: false };
	if (ctx.git === null) return { block: false };
	if (ctx.entryCount === 0) return { block: false };
	const uncommittedEntryMtime = ctx.git.dirtyEntries.reduce((max, e) => Math.max(max, e.mtimeSec), 0);
	const anchor = Math.max(ctx.git.journalCommitTime, uncommittedEntryMtime);
	const commits = ctx.git.listCommitsSince(anchor);
	const dirty = ctx.git.dirty;
	if (commits.length === 0 && dirty.length === 0) return { block: false };
	const fingerprint = buildFingerprint(ctx.git.headSha, dirty);
	const last = ctx.state?.lastNudge;
	if (last !== void 0) {
		if (last.fingerprint === fingerprint) return { block: false };
		if (last.sessionId === input.sessionId && ctx.mode !== "auto") {
			if (!(last.anchor !== void 0 && anchor > last.anchor) || commits.length === 0) return { block: false };
		}
	}
	const summary = buildSummary(commits.length, dirty.length);
	return {
		block: true,
		reason: ctx.mode === "auto" ? buildReasonAuto(summary) : buildReasonAsk(summary),
		newState: {
			stateVersion: 1,
			lastNudge: {
				sessionId: input.sessionId,
				fingerprint,
				at: ctx.now.toISOString(),
				anchor
			}
		}
	};
}
/**
* Record state FIRST, then nudge (§3.4 step 10): a crash after the state write
* costs one lost nudge, never a loop. writeState throwing ⇒ nudge skipped
* entirely (the caller's catch turns it into a silent allow).
*/
function applyDecision(decision, io) {
	if (!decision.block) return;
	io.writeState(decision.newState);
	io.emit(JSON.stringify({
		decision: "block",
		reason: decision.reason
	}));
}
function runGit(projectDir, gitArgs) {
	try {
		const r = spawnSync("git", [
			"-C",
			projectDir,
			...gitArgs
		], {
			timeout: GIT_TIMEOUT_MS,
			encoding: "utf8"
		});
		const timedOut = r.error !== void 0 && r.error.code === "ETIMEDOUT";
		return {
			ok: r.error === void 0 && r.status === 0,
			stdout: r.stdout ?? "",
			timedOut
		};
	} catch {
		return {
			ok: false,
			stdout: "",
			timedOut: false
		};
	}
}
function isEntryBasename(basename) {
	return basename.endsWith(".md") && !EXCLUDED_BASENAMES.has(basename);
}
/** Count journal entries: *.md minus INDEX.md/manifest.json (cold-journal guard). */
function countEntries(journalDir) {
	try {
		return readdirSync(journalDir).filter((f) => isEntryBasename(f)).length;
	} catch {
		return 0;
	}
}
/** Extract the path from a `git status --porcelain` line (rename ⇒ new path). */
function porcelainPath(line) {
	const raw = line.slice(3);
	const arrow = raw.indexOf(" -> ");
	return arrow === -1 ? raw : raw.slice(arrow + 4);
}
/** Stat every entry file directly — the anchor source when git can't see them. */
function statJournalEntries(projectDir) {
	const out = [];
	try {
		for (const f of readdirSync(path.join(projectDir, JOURNAL_DIR))) {
			if (!isEntryBasename(f)) continue;
			const st = statSync(path.join(projectDir, JOURNAL_DIR, f));
			out.push({
				path: JOURNAL_DIR + "/" + f,
				mtimeSec: Math.floor(st.mtimeMs / 1e3)
			});
		}
	} catch {}
	return out;
}
function gatherGitFacts(projectDir) {
	const inside = runGit(projectDir, ["rev-parse", "--is-inside-work-tree"]);
	if (!inside.ok || inside.stdout.trim() !== "true") return null;
	const head = runGit(projectDir, ["rev-parse", "HEAD"]);
	const headSha = head.ok ? head.stdout.trim() : null;
	const journalLog = runGit(projectDir, [
		"log",
		"-1",
		"--format=%ct",
		"--",
		JOURNAL_DIR
	]);
	const journalCommitTime = journalLog.ok ? parseInt(journalLog.stdout.trim(), 10) || 0 : 0;
	const status = runGit(projectDir, [
		"-c",
		"core.quotepath=off",
		"status",
		"--porcelain",
		"--untracked-files=normal"
	]);
	const dirty = [];
	const dirtyEntries = [];
	if (status.ok) for (const line of status.stdout.split("\n")) {
		if (line.trim() === "") continue;
		const filePath = porcelainPath(line);
		if (filePath === ".whydone/" || filePath === ".whydone") dirtyEntries.push(...statJournalEntries(projectDir));
		else if (filePath.startsWith(".whydone/")) {
			if (isEntryBasename(path.posix.basename(filePath))) try {
				const st = statSync(path.join(projectDir, filePath));
				dirtyEntries.push({
					path: filePath,
					mtimeSec: Math.floor(st.mtimeMs / 1e3)
				});
			} catch {}
		} else dirty.push(line);
	}
	if (status.ok && journalCommitTime === 0 && dirtyEntries.length === 0) dirtyEntries.push(...statJournalEntries(projectDir));
	const listCommitsSince = (epochSec) => {
		if (headSha === null) return [];
		const sinceIso = (/* @__PURE__ */ new Date((epochSec + 1) * 1e3)).toISOString();
		const cap = `-n${LOG_COMMIT_CAP}`;
		const all = runGit(projectDir, [
			"log",
			cap,
			`--since=${sinceIso}`,
			"--format=%h"
		]);
		if (!all.ok) return [];
		const journal = runGit(projectDir, [
			"log",
			cap,
			`--since=${sinceIso}`,
			"--format=%h",
			"--",
			JOURNAL_DIR
		]);
		const journalSet = new Set(journal.ok ? journal.stdout.split("\n").filter((l) => l.trim() !== "") : []);
		return all.stdout.split("\n").map((l) => l.trim()).filter((h) => h !== "" && !journalSet.has(h)).slice(0, MAX_COMMITS);
	};
	return {
		headSha,
		journalCommitTime,
		dirty,
		dirtyEntries,
		statusTimedOut: status.timedOut,
		listCommitsSince
	};
}
function readStateFile(projectDir) {
	try {
		const raw = readFileSync(path.join(projectDir, JOURNAL_DIR, CACHE_DIR_BASENAME, STATE_BASENAME), "utf8");
		const parsed = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}
function writeStateFile(projectDir, state) {
	const cacheDir = path.join(projectDir, JOURNAL_DIR, CACHE_DIR_BASENAME);
	mkdirSync(cacheDir, { recursive: true });
	try {
		writeFileSync(path.join(cacheDir, ".gitignore"), "*\n", {
			encoding: "utf8",
			flag: "wx"
		});
	} catch {}
	writeFileSync(path.join(cacheDir, STATE_BASENAME), JSON.stringify(state, null, 2), "utf8");
}
/** Read stdin fully with a self-timeout (§3.4 step 1). */
function readStdin(timeoutMs) {
	return new Promise((resolve) => {
		let data = "";
		const timer = setTimeout(() => resolve(data), timeoutMs);
		timer.unref?.();
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => {
			data += chunk;
		});
		process.stdin.on("end", () => {
			clearTimeout(timer);
			resolve(data);
		});
		process.stdin.on("error", () => {
			clearTimeout(timer);
			resolve(data);
		});
	});
}
async function runStop() {
	const raw = await readStdin(STDIN_TIMEOUT_MS);
	if (raw.trim() === "") return;
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return;
	}
	if (typeof parsed !== "object" || parsed === null) return;
	const obj = parsed;
	const input = {
		sessionId: typeof obj.session_id === "string" ? obj.session_id : "",
		stopHookActive: obj.stop_hook_active === true
	};
	const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
	const journalDir = path.join(projectDir, JOURNAL_DIR);
	const journalDirExists = existsSync(journalDir);
	if (!journalDirExists) return;
	const { mode } = await readConfig(journalDir);
	if (mode === "manual") return;
	applyDecision(decideStop(input, {
		mode,
		journalDirExists,
		entryCount: countEntries(journalDir),
		git: gatherGitFacts(projectDir),
		state: readStateFile(projectDir),
		now: /* @__PURE__ */ new Date()
	}), {
		writeState: (state) => writeStateFile(projectDir, state),
		emit: (line) => writeFileSync(1, line + "\n")
	});
}
var NUDGE_PREFIX, GIT_TIMEOUT_MS, STDIN_TIMEOUT_MS, MAX_COMMITS, LOG_COMMIT_CAP, CACHE_DIR_BASENAME, STATE_BASENAME, hook_stop_default;
var init_hook_stop = __esmMin((() => {
	init_dist$6();
	init_constants();
	init_config();
	init_glob_entries();
	NUDGE_PREFIX = "whydone: unlogged work detected";
	GIT_TIMEOUT_MS = 2e3;
	STDIN_TIMEOUT_MS = 5e3;
	MAX_COMMITS = 20;
	LOG_COMMIT_CAP = 500;
	CACHE_DIR_BASENAME = ".cache";
	STATE_BASENAME = "hook-state.json";
	hook_stop_default = defineCommand({
		meta: {
			name: "stop",
			description: "Internal: Claude Code Stop-hook handler (reads hook JSON on stdin)"
		},
		async run() {
			try {
				await runStop();
			} catch (err) {
				if (process.env.WHYDONE_HOOK_DEBUG === "1") try {
					process.stderr.write(String(err) + "\n");
				} catch {}
			}
			process.exit(0);
		}
	});
}));
//#endregion
//#region src/commands/hook.ts
var hook_exports = /* @__PURE__ */ __exportAll({ default: () => hook_default });
var hook_default;
var init_hook = __esmMin((() => {
	init_dist$6();
	hook_default = defineCommand({
		meta: {
			name: "hook",
			description: "Internal hook handlers (invoked by Claude Code hooks, not by users)"
		},
		subCommands: { stop: () => Promise.resolve().then(() => (init_hook_stop(), hook_stop_exports)).then((m) => m.default) }
	});
}));
//#endregion
//#region src/cli.ts
init_dist$6();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = createRequire(import.meta.url)(path.join(__dirname, "..", "package.json"));
runMain(defineCommand({
	meta: {
		name: pkg.name,
		version: pkg.version,
		description: pkg.description
	},
	subCommands: {
		init: () => Promise.resolve().then(() => (init_init(), init_exports)).then((m) => m.default),
		index: () => Promise.resolve().then(() => (init_build_index(), build_index_exports)).then((m) => m.default),
		validate: () => Promise.resolve().then(() => (init_validate(), validate_exports)).then((m) => m.default),
		recall: () => Promise.resolve().then(() => (init_recall(), recall_exports)).then((m) => m.default),
		update: () => Promise.resolve().then(() => (init_update(), update_exports)).then((m) => m.default),
		uninstall: () => Promise.resolve().then(() => (init_uninstall(), uninstall_exports)).then((m) => m.default),
		hide: () => Promise.resolve().then(() => (init_hide(), hide_exports)).then((m) => m.default),
		publish: () => Promise.resolve().then(() => (init_publish(), publish_exports)).then((m) => m.default),
		hook: () => Promise.resolve().then(() => (init_hook(), hook_exports)).then((m) => m.default)
	}
}));
//#endregion
export {};
