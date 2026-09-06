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
var __require$1 = /* @__PURE__ */ createRequire(import.meta.url);
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
* Build the whydone marker block content, with markers around it.
*
* The block is mode-neutral by design (06-DESIGN §6.5): the journal mode
* lives in `.whydone/config.json` and can change on a mere git pull, so the
* block routes writes through /log and lets the skill read the mode itself.
*/
function buildBlock(indexPath, scope) {
	const firstSentence = scope === "global" ? `Projects may keep a work journal in a repo-level \`.whydone/\` directory. If present, read \`${indexPath}\` for an overview; do not bulk-read entry files.\n` : `This project keeps a decision log in \`.whydone/\`. For an overview read \`${indexPath}\`; do not bulk-read entry files.\n`;
	return `${MARKER_START}\n## whydone — work journal\n\n` + firstSentence + `Before starting work on a topic, load relevant past entries with \`/recall\` (or \`/whydone:recall\` if installed as a plugin).
Entries are written only through the \`/log\` skill, per the journal mode in \`.whydone/config.json\` (ask / auto / manual — the skill reads it itself). Never create or edit \`.whydone/\` entry files by any other means.
${MARKER_END}`;
}
/**
* Insert or update the whydone marker block in CLAUDE.md.
*
* - Reads the file (creates empty string if ENOENT)
* - If markers found: replaces the block between them (idempotent update)
* - If not found: appends block with two-newline separator
*
* T-02-05 mitigation: idempotent — indexOf check before deciding insert vs. replace path.
*/
async function patchClaudeMd(claudeMdPath, indexPath, scope = "project") {
	let existing;
	try {
		existing = await readFile(claudeMdPath, "utf-8");
	} catch (err) {
		if (err.code === "ENOENT") existing = "";
		else throw err;
	}
	const newBlock = buildBlock(indexPath, scope);
	const startIdx = existing.indexOf(MARKER_START);
	const endIdx = existing.indexOf(MARKER_END);
	let result;
	if (startIdx !== -1 && endIdx !== -1) result = existing.slice(0, startIdx) + newBlock + existing.slice(endIdx + 20);
	else {
		const head = existing.trimEnd();
		result = (head ? head + "\n\n" : "") + newBlock + "\n";
	}
	await writeFile(claudeMdPath, result, "utf-8");
}
/**
* Remove the whydone marker block from CLAUDE.md.
*
* - No-ops if block not found or file does not exist
* - Preserves all content before and after the block
*/
async function removeMarkerBlock(claudeMdPath) {
	let existing;
	try {
		existing = await readFile(claudeMdPath, "utf-8");
	} catch (err) {
		if (err.code === "ENOENT") return;
		throw err;
	}
	const startIdx = existing.indexOf(MARKER_START);
	const endIdx = existing.indexOf(MARKER_END);
	if (startIdx === -1 || endIdx === -1) return;
	const before = existing.slice(0, startIdx).trimEnd();
	const after = existing.slice(endIdx + 20).replace(/^\n+/, "");
	let result;
	if (after) result = before + "\n\n" + after;
	else result = before + "\n";
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
* Read the whydone lock file.
*
* T-02-04 mitigation: JSON.parse wrapped in try/catch — returns null on ENOENT
* or invalid JSON; never throws.
*
* @param lockPath - Absolute path to the lock file
* @returns Parsed LockFile or null if file missing or JSON invalid
*/
async function readLockFile(lockPath) {
	try {
		const raw = await readFile(lockPath, "utf-8");
		return JSON.parse(raw);
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
		return {
			mode: obj.mode,
			storage: asStorage(obj.storage)
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
* storage). Read-modify-write: unknown keys in an existing (parseable) file
* are preserved (design §1.1). storage is only written when passed explicitly
* or already present — a v0.3-era two-key config stays byte-stable across
* mode-only rewrites. Serialized with JSON.stringify(_, null, 2).
*/
async function writeConfigMode(journalDir, mode, storage) {
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
	await writeFile(configPath, JSON.stringify(next, null, 2), "utf-8");
}
var CONFIG_BASENAME, VALID_MODES;
var init_config = __esmMin((() => {
	CONFIG_BASENAME = "config.json";
	VALID_MODES = new Set([
		"ask",
		"auto",
		"manual"
	]);
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
var HOOK_MARKER, LAUNCHER_BASENAME, _testSeams;
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
var require_utils$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
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
	const utils = require_utils$1();
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
var require_parse$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const constants = require_constants();
	const utils = require_utils$1();
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
	const parse = require_parse$1();
	const utils = require_utils$1();
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
	const utils = require_utils$1();
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
//#region node_modules/kind-of/index.js
var require_kind_of = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var toString = Object.prototype.toString;
	module.exports = function kindOf(val) {
		if (val === void 0) return "undefined";
		if (val === null) return "null";
		var type = typeof val;
		if (type === "boolean") return "boolean";
		if (type === "string") return "string";
		if (type === "number") return "number";
		if (type === "symbol") return "symbol";
		if (type === "function") return isGeneratorFn(val) ? "generatorfunction" : "function";
		if (isArray(val)) return "array";
		if (isBuffer(val)) return "buffer";
		if (isArguments(val)) return "arguments";
		if (isDate(val)) return "date";
		if (isError(val)) return "error";
		if (isRegexp(val)) return "regexp";
		switch (ctorName(val)) {
			case "Symbol": return "symbol";
			case "Promise": return "promise";
			case "WeakMap": return "weakmap";
			case "WeakSet": return "weakset";
			case "Map": return "map";
			case "Set": return "set";
			case "Int8Array": return "int8array";
			case "Uint8Array": return "uint8array";
			case "Uint8ClampedArray": return "uint8clampedarray";
			case "Int16Array": return "int16array";
			case "Uint16Array": return "uint16array";
			case "Int32Array": return "int32array";
			case "Uint32Array": return "uint32array";
			case "Float32Array": return "float32array";
			case "Float64Array": return "float64array";
		}
		if (isGeneratorObj(val)) return "generator";
		type = toString.call(val);
		switch (type) {
			case "[object Object]": return "object";
			case "[object Map Iterator]": return "mapiterator";
			case "[object Set Iterator]": return "setiterator";
			case "[object String Iterator]": return "stringiterator";
			case "[object Array Iterator]": return "arrayiterator";
		}
		return type.slice(8, -1).toLowerCase().replace(/\s/g, "");
	};
	function ctorName(val) {
		return typeof val.constructor === "function" ? val.constructor.name : null;
	}
	function isArray(val) {
		if (Array.isArray) return Array.isArray(val);
		return val instanceof Array;
	}
	function isError(val) {
		return val instanceof Error || typeof val.message === "string" && val.constructor && typeof val.constructor.stackTraceLimit === "number";
	}
	function isDate(val) {
		if (val instanceof Date) return true;
		return typeof val.toDateString === "function" && typeof val.getDate === "function" && typeof val.setDate === "function";
	}
	function isRegexp(val) {
		if (val instanceof RegExp) return true;
		return typeof val.flags === "string" && typeof val.ignoreCase === "boolean" && typeof val.multiline === "boolean" && typeof val.global === "boolean";
	}
	function isGeneratorFn(name, val) {
		return ctorName(name) === "GeneratorFunction";
	}
	function isGeneratorObj(val) {
		return typeof val.throw === "function" && typeof val.return === "function" && typeof val.next === "function";
	}
	function isArguments(val) {
		try {
			if (typeof val.length === "number" && typeof val.callee === "function") return true;
		} catch (err) {
			if (err.message.indexOf("callee") !== -1) return true;
		}
		return false;
	}
	/**
	* If you need to support Safari 5-7 (8-10 yr-old browser),
	* take a look at https://github.com/feross/is-buffer
	*/
	function isBuffer(val) {
		if (val.constructor && typeof val.constructor.isBuffer === "function") return val.constructor.isBuffer(val);
		return false;
	}
}));
//#endregion
//#region node_modules/is-extendable/index.js
/*!
* is-extendable <https://github.com/jonschlinkert/is-extendable>
*
* Copyright (c) 2015, Jon Schlinkert.
* Licensed under the MIT License.
*/
var require_is_extendable = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function isExtendable(val) {
		return typeof val !== "undefined" && val !== null && (typeof val === "object" || typeof val === "function");
	};
}));
//#endregion
//#region node_modules/extend-shallow/index.js
var require_extend_shallow = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isObject = require_is_extendable();
	module.exports = function extend(o) {
		if (!isObject(o)) o = {};
		var len = arguments.length;
		for (var i = 1; i < len; i++) {
			var obj = arguments[i];
			if (isObject(obj)) assign(o, obj);
		}
		return o;
	};
	function assign(a, b) {
		for (var key in b) if (hasOwn(b, key)) a[key] = b[key];
	}
	/**
	* Returns true if the given `key` is an own property of `obj`.
	*/
	function hasOwn(obj, key) {
		return Object.prototype.hasOwnProperty.call(obj, key);
	}
}));
//#endregion
//#region node_modules/section-matter/index.js
var require_section_matter = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var typeOf = require_kind_of();
	var extend = require_extend_shallow();
	/**
	* Parse sections in `input` with the given `options`.
	*
	* ```js
	* var sections = require('{%= name %}');
	* var result = sections(input, options);
	* // { content: 'Content before sections', sections: [] }
	* ```
	* @param {String|Buffer|Object} `input` If input is an object, it's `content` property must be a string or buffer.
	* @param {Object} options
	* @return {Object} Returns an object with a `content` string and an array of `sections` objects.
	* @api public
	*/
	module.exports = function(input, options) {
		if (typeof options === "function") options = { parse: options };
		var file = toObject(input);
		var opts = extend({}, {
			section_delimiter: "---",
			parse: identity
		}, options);
		var delim = opts.section_delimiter;
		var lines = file.content.split(/\r?\n/);
		var sections = null;
		var section = createSection();
		var content = [];
		var stack = [];
		function initSections(val) {
			file.content = val;
			sections = [];
			content = [];
		}
		function closeSection(val) {
			if (stack.length) {
				section.key = getKey(stack[0], delim);
				section.content = val;
				opts.parse(section, sections);
				sections.push(section);
				section = createSection();
				content = [];
				stack = [];
			}
		}
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			var len = stack.length;
			var ln = line.trim();
			if (isDelimiter(ln, delim)) {
				if (ln.length === 3 && i !== 0) {
					if (len === 0 || len === 2) {
						content.push(line);
						continue;
					}
					stack.push(ln);
					section.data = content.join("\n");
					content = [];
					continue;
				}
				if (sections === null) initSections(content.join("\n"));
				if (len === 2) closeSection(content.join("\n"));
				stack.push(ln);
				continue;
			}
			content.push(line);
		}
		if (sections === null) initSections(content.join("\n"));
		else closeSection(content.join("\n"));
		file.sections = sections;
		return file;
	};
	function isDelimiter(line, delim) {
		if (line.slice(0, delim.length) !== delim) return false;
		if (line.charAt(delim.length + 1) === delim.slice(-1)) return false;
		return true;
	}
	function toObject(input) {
		if (typeOf(input) !== "object") input = { content: input };
		if (typeof input.content !== "string" && !isBuffer(input.content)) throw new TypeError("expected a buffer or string");
		input.content = input.content.toString();
		input.sections = [];
		return input;
	}
	function getKey(val, delim) {
		return val ? val.slice(delim.length).trim() : "";
	}
	function createSection() {
		return {
			key: "",
			data: "",
			content: ""
		};
	}
	function identity(val) {
		return val;
	}
	function isBuffer(val) {
		if (val && val.constructor && typeof val.constructor.isBuffer === "function") return val.constructor.isBuffer(val);
		return false;
	}
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/common.js
var require_common = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
		var index, length, key, sourceKeys;
		if (source) {
			sourceKeys = Object.keys(source);
			for (index = 0, length = sourceKeys.length; index < length; index += 1) {
				key = sourceKeys[index];
				target[key] = source[key];
			}
		}
		return target;
	}
	function repeat(string, count) {
		var result = "", cycle;
		for (cycle = 0; cycle < count; cycle += 1) result += string;
		return result;
	}
	function isNegativeZero(number) {
		return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
	}
	module.exports.isNothing = isNothing;
	module.exports.isObject = isObject;
	module.exports.toArray = toArray;
	module.exports.repeat = repeat;
	module.exports.isNegativeZero = isNegativeZero;
	module.exports.extend = extend;
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/exception.js
var require_exception = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function YAMLException(reason, mark) {
		Error.call(this);
		this.name = "YAMLException";
		this.reason = reason;
		this.mark = mark;
		this.message = (this.reason || "(unknown reason)") + (this.mark ? " " + this.mark.toString() : "");
		if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
		else this.stack = (/* @__PURE__ */ new Error()).stack || "";
	}
	YAMLException.prototype = Object.create(Error.prototype);
	YAMLException.prototype.constructor = YAMLException;
	YAMLException.prototype.toString = function toString(compact) {
		var result = this.name + ": ";
		result += this.reason || "(unknown reason)";
		if (!compact && this.mark) result += " " + this.mark.toString();
		return result;
	};
	module.exports = YAMLException;
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/mark.js
var require_mark = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common();
	function Mark(name, buffer, position, line, column) {
		this.name = name;
		this.buffer = buffer;
		this.position = position;
		this.line = line;
		this.column = column;
	}
	Mark.prototype.getSnippet = function getSnippet(indent, maxLength) {
		var head, start, tail, end, snippet;
		if (!this.buffer) return null;
		indent = indent || 4;
		maxLength = maxLength || 75;
		head = "";
		start = this.position;
		while (start > 0 && "\0\r\n\u2028\u2029".indexOf(this.buffer.charAt(start - 1)) === -1) {
			start -= 1;
			if (this.position - start > maxLength / 2 - 1) {
				head = " ... ";
				start += 5;
				break;
			}
		}
		tail = "";
		end = this.position;
		while (end < this.buffer.length && "\0\r\n\u2028\u2029".indexOf(this.buffer.charAt(end)) === -1) {
			end += 1;
			if (end - this.position > maxLength / 2 - 1) {
				tail = " ... ";
				end -= 5;
				break;
			}
		}
		snippet = this.buffer.slice(start, end);
		return common.repeat(" ", indent) + head + snippet + tail + "\n" + common.repeat(" ", indent + this.position - start + head.length) + "^";
	};
	Mark.prototype.toString = function toString(compact) {
		var snippet, where = "";
		if (this.name) where += "in \"" + this.name + "\" ";
		where += "at line " + (this.line + 1) + ", column " + (this.column + 1);
		if (!compact) {
			snippet = this.getSnippet();
			if (snippet) where += ":\n" + snippet;
		}
		return where;
	};
	module.exports = Mark;
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type.js
var require_type = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var YAMLException = require_exception();
	var TYPE_CONSTRUCTOR_OPTIONS = [
		"kind",
		"resolve",
		"construct",
		"instanceOf",
		"predicate",
		"represent",
		"defaultStyle",
		"styleAliases"
	];
	var YAML_NODE_KINDS = [
		"scalar",
		"sequence",
		"mapping"
	];
	function compileStyleAliases(map) {
		var result = {};
		if (map !== null) Object.keys(map).forEach(function(style) {
			map[style].forEach(function(alias) {
				result[String(alias)] = style;
			});
		});
		return result;
	}
	function Type(tag, options) {
		options = options || {};
		Object.keys(options).forEach(function(name) {
			if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) throw new YAMLException("Unknown option \"" + name + "\" is met in definition of \"" + tag + "\" YAML type.");
		});
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
		this.defaultStyle = options["defaultStyle"] || null;
		this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
		if (YAML_NODE_KINDS.indexOf(this.kind) === -1) throw new YAMLException("Unknown kind \"" + this.kind + "\" is specified for \"" + tag + "\" YAML type.");
	}
	module.exports = Type;
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/schema.js
var require_schema = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common();
	var YAMLException = require_exception();
	var Type = require_type();
	function compileList(schema, name, result) {
		var exclude = [];
		schema.include.forEach(function(includedSchema) {
			result = compileList(includedSchema, name, result);
		});
		schema[name].forEach(function(currentType) {
			result.forEach(function(previousType, previousIndex) {
				if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) exclude.push(previousIndex);
			});
			result.push(currentType);
		});
		return result.filter(function(type, index) {
			return exclude.indexOf(index) === -1;
		});
	}
	function compileMap() {
		var result = {
			scalar: {},
			sequence: {},
			mapping: {},
			fallback: {}
		}, index, length;
		function collectType(type) {
			result[type.kind][type.tag] = result["fallback"][type.tag] = type;
		}
		for (index = 0, length = arguments.length; index < length; index += 1) arguments[index].forEach(collectType);
		return result;
	}
	function Schema(definition) {
		this.include = definition.include || [];
		this.implicit = definition.implicit || [];
		this.explicit = definition.explicit || [];
		this.implicit.forEach(function(type) {
			if (type.loadKind && type.loadKind !== "scalar") throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
		});
		this.compiledImplicit = compileList(this, "implicit", []);
		this.compiledExplicit = compileList(this, "explicit", []);
		this.compiledTypeMap = compileMap(this.compiledImplicit, this.compiledExplicit);
	}
	Schema.DEFAULT = null;
	Schema.create = function createSchema() {
		var schemas, types;
		switch (arguments.length) {
			case 1:
				schemas = Schema.DEFAULT;
				types = arguments[0];
				break;
			case 2:
				schemas = arguments[0];
				types = arguments[1];
				break;
			default: throw new YAMLException("Wrong number of arguments for Schema.create function");
		}
		schemas = common.toArray(schemas);
		types = common.toArray(types);
		if (!schemas.every(function(schema) {
			return schema instanceof Schema;
		})) throw new YAMLException("Specified list of super schemas (or a single Schema object) contains a non-Schema object.");
		if (!types.every(function(type) {
			return type instanceof Type;
		})) throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
		return new Schema({
			include: schemas,
			explicit: types
		});
	};
	module.exports = Schema;
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/str.js
var require_str = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_type())("tag:yaml.org,2002:str", {
		kind: "scalar",
		construct: function(data) {
			return data !== null ? data : "";
		}
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/seq.js
var require_seq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_type())("tag:yaml.org,2002:seq", {
		kind: "sequence",
		construct: function(data) {
			return data !== null ? data : [];
		}
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/map.js
var require_map = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_type())("tag:yaml.org,2002:map", {
		kind: "mapping",
		construct: function(data) {
			return data !== null ? data : {};
		}
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/schema/failsafe.js
var require_failsafe = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_schema())({ explicit: [
		require_str(),
		require_seq(),
		require_map()
	] });
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/null.js
var require_null = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	function resolveYamlNull(data) {
		if (data === null) return true;
		var max = data.length;
		return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
	}
	function constructYamlNull() {
		return null;
	}
	function isNull(object) {
		return object === null;
	}
	module.exports = new Type("tag:yaml.org,2002:null", {
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
			}
		},
		defaultStyle: "lowercase"
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/bool.js
var require_bool = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	function resolveYamlBoolean(data) {
		if (data === null) return false;
		var max = data.length;
		return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
	}
	function constructYamlBoolean(data) {
		return data === "true" || data === "True" || data === "TRUE";
	}
	function isBoolean(object) {
		return Object.prototype.toString.call(object) === "[object Boolean]";
	}
	module.exports = new Type("tag:yaml.org,2002:bool", {
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
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/int.js
var require_int = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common();
	var Type = require_type();
	function isHexCode(c) {
		return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
	}
	function isOctCode(c) {
		return 48 <= c && c <= 55;
	}
	function isDecCode(c) {
		return 48 <= c && c <= 57;
	}
	function resolveYamlInteger(data) {
		if (data === null) return false;
		var max = data.length, index = 0, hasDigits = false, ch;
		if (!max) return false;
		ch = data[index];
		if (ch === "-" || ch === "+") ch = data[++index];
		if (ch === "0") {
			if (index + 1 === max) return true;
			ch = data[++index];
			if (ch === "b") {
				index++;
				for (; index < max; index++) {
					ch = data[index];
					if (ch === "_") continue;
					if (ch !== "0" && ch !== "1") return false;
					hasDigits = true;
				}
				return hasDigits && ch !== "_";
			}
			if (ch === "x") {
				index++;
				for (; index < max; index++) {
					ch = data[index];
					if (ch === "_") continue;
					if (!isHexCode(data.charCodeAt(index))) return false;
					hasDigits = true;
				}
				return hasDigits && ch !== "_";
			}
			for (; index < max; index++) {
				ch = data[index];
				if (ch === "_") continue;
				if (!isOctCode(data.charCodeAt(index))) return false;
				hasDigits = true;
			}
			return hasDigits && ch !== "_";
		}
		if (ch === "_") return false;
		for (; index < max; index++) {
			ch = data[index];
			if (ch === "_") continue;
			if (ch === ":") break;
			if (!isDecCode(data.charCodeAt(index))) return false;
			hasDigits = true;
		}
		if (!hasDigits || ch === "_") return false;
		if (ch !== ":") return true;
		return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
	}
	function constructYamlInteger(data) {
		var value = data, sign = 1, ch, base, digits = [];
		if (value.indexOf("_") !== -1) value = value.replace(/_/g, "");
		ch = value[0];
		if (ch === "-" || ch === "+") {
			if (ch === "-") sign = -1;
			value = value.slice(1);
			ch = value[0];
		}
		if (value === "0") return 0;
		if (ch === "0") {
			if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
			if (value[1] === "x") return sign * parseInt(value, 16);
			return sign * parseInt(value, 8);
		}
		if (value.indexOf(":") !== -1) {
			value.split(":").forEach(function(v) {
				digits.unshift(parseInt(v, 10));
			});
			value = 0;
			base = 1;
			digits.forEach(function(d) {
				value += d * base;
				base *= 60;
			});
			return sign * value;
		}
		return sign * parseInt(value, 10);
	}
	function isInteger(object) {
		return Object.prototype.toString.call(object) === "[object Number]" && object % 1 === 0 && !common.isNegativeZero(object);
	}
	module.exports = new Type("tag:yaml.org,2002:int", {
		kind: "scalar",
		resolve: resolveYamlInteger,
		construct: constructYamlInteger,
		predicate: isInteger,
		represent: {
			binary: function(obj) {
				return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
			},
			octal: function(obj) {
				return obj >= 0 ? "0" + obj.toString(8) : "-0" + obj.toString(8).slice(1);
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
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/float.js
var require_float = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common();
	var Type = require_type();
	var YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
	function resolveYamlFloat(data) {
		if (data === null) return false;
		if (!YAML_FLOAT_PATTERN.test(data) || data[data.length - 1] === "_") return false;
		return true;
	}
	function constructYamlFloat(data) {
		var value = data.replace(/_/g, "").toLowerCase(), sign = value[0] === "-" ? -1 : 1, base, digits = [];
		if ("+-".indexOf(value[0]) >= 0) value = value.slice(1);
		if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
		else if (value === ".nan") return NaN;
		else if (value.indexOf(":") >= 0) {
			value.split(":").forEach(function(v) {
				digits.unshift(parseFloat(v, 10));
			});
			value = 0;
			base = 1;
			digits.forEach(function(d) {
				value += d * base;
				base *= 60;
			});
			return sign * value;
		}
		return sign * parseFloat(value, 10);
	}
	var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
	function representYamlFloat(object, style) {
		var res;
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
		else if (common.isNegativeZero(object)) return "-0.0";
		res = object.toString(10);
		return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
	}
	function isFloat(object) {
		return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
	}
	module.exports = new Type("tag:yaml.org,2002:float", {
		kind: "scalar",
		resolve: resolveYamlFloat,
		construct: constructYamlFloat,
		predicate: isFloat,
		represent: representYamlFloat,
		defaultStyle: "lowercase"
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/schema/json.js
var require_json = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_schema())({
		include: [require_failsafe()],
		implicit: [
			require_null(),
			require_bool(),
			require_int(),
			require_float()
		]
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/schema/core.js
var require_core = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_schema())({ include: [require_json()] });
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/timestamp.js
var require_timestamp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	var YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
	var YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
	function resolveYamlTimestamp(data) {
		if (data === null) return false;
		if (YAML_DATE_REGEXP.exec(data) !== null) return true;
		if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
		return false;
	}
	function constructYamlTimestamp(data) {
		var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
		match = YAML_DATE_REGEXP.exec(data);
		if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
		if (match === null) throw new Error("Date resolve error");
		year = +match[1];
		month = +match[2] - 1;
		day = +match[3];
		if (!match[4]) return new Date(Date.UTC(year, month, day));
		hour = +match[4];
		minute = +match[5];
		second = +match[6];
		if (match[7]) {
			fraction = match[7].slice(0, 3);
			while (fraction.length < 3) fraction += "0";
			fraction = +fraction;
		}
		if (match[9]) {
			tz_hour = +match[10];
			tz_minute = +(match[11] || 0);
			delta = (tz_hour * 60 + tz_minute) * 6e4;
			if (match[9] === "-") delta = -delta;
		}
		date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
		if (delta) date.setTime(date.getTime() - delta);
		return date;
	}
	function representYamlTimestamp(object) {
		return object.toISOString();
	}
	module.exports = new Type("tag:yaml.org,2002:timestamp", {
		kind: "scalar",
		resolve: resolveYamlTimestamp,
		construct: constructYamlTimestamp,
		instanceOf: Date,
		represent: representYamlTimestamp
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/merge.js
var require_merge = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	function resolveYamlMerge(data) {
		return data === "<<" || data === null;
	}
	module.exports = new Type("tag:yaml.org,2002:merge", {
		kind: "scalar",
		resolve: resolveYamlMerge
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/binary.js
var require_binary = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var NodeBuffer;
	try {
		NodeBuffer = __require$1("buffer").Buffer;
	} catch (__) {}
	var Type = require_type();
	var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
	function resolveYamlBinary(data) {
		if (data === null) return false;
		var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
		for (idx = 0; idx < max; idx++) {
			code = map.indexOf(data.charAt(idx));
			if (code > 64) continue;
			if (code < 0) return false;
			bitlen += 6;
		}
		return bitlen % 8 === 0;
	}
	function constructYamlBinary(data) {
		var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map = BASE64_MAP, bits = 0, result = [];
		for (idx = 0; idx < max; idx++) {
			if (idx % 4 === 0 && idx) {
				result.push(bits >> 16 & 255);
				result.push(bits >> 8 & 255);
				result.push(bits & 255);
			}
			bits = bits << 6 | map.indexOf(input.charAt(idx));
		}
		tailbits = max % 4 * 6;
		if (tailbits === 0) {
			result.push(bits >> 16 & 255);
			result.push(bits >> 8 & 255);
			result.push(bits & 255);
		} else if (tailbits === 18) {
			result.push(bits >> 10 & 255);
			result.push(bits >> 2 & 255);
		} else if (tailbits === 12) result.push(bits >> 4 & 255);
		if (NodeBuffer) return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
		return result;
	}
	function representYamlBinary(object) {
		var result = "", bits = 0, idx, tail, max = object.length, map = BASE64_MAP;
		for (idx = 0; idx < max; idx++) {
			if (idx % 3 === 0 && idx) {
				result += map[bits >> 18 & 63];
				result += map[bits >> 12 & 63];
				result += map[bits >> 6 & 63];
				result += map[bits & 63];
			}
			bits = (bits << 8) + object[idx];
		}
		tail = max % 3;
		if (tail === 0) {
			result += map[bits >> 18 & 63];
			result += map[bits >> 12 & 63];
			result += map[bits >> 6 & 63];
			result += map[bits & 63];
		} else if (tail === 2) {
			result += map[bits >> 10 & 63];
			result += map[bits >> 4 & 63];
			result += map[bits << 2 & 63];
			result += map[64];
		} else if (tail === 1) {
			result += map[bits >> 2 & 63];
			result += map[bits << 4 & 63];
			result += map[64];
			result += map[64];
		}
		return result;
	}
	function isBinary(object) {
		return NodeBuffer && NodeBuffer.isBuffer(object);
	}
	module.exports = new Type("tag:yaml.org,2002:binary", {
		kind: "scalar",
		resolve: resolveYamlBinary,
		construct: constructYamlBinary,
		predicate: isBinary,
		represent: representYamlBinary
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/omap.js
var require_omap = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	var _hasOwnProperty = Object.prototype.hasOwnProperty;
	var _toString = Object.prototype.toString;
	function resolveYamlOmap(data) {
		if (data === null) return true;
		var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
		for (index = 0, length = object.length; index < length; index += 1) {
			pair = object[index];
			pairHasKey = false;
			if (_toString.call(pair) !== "[object Object]") return false;
			for (pairKey in pair) if (_hasOwnProperty.call(pair, pairKey)) if (!pairHasKey) pairHasKey = true;
			else return false;
			if (!pairHasKey) return false;
			if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
			else return false;
		}
		return true;
	}
	function constructYamlOmap(data) {
		return data !== null ? data : [];
	}
	module.exports = new Type("tag:yaml.org,2002:omap", {
		kind: "sequence",
		resolve: resolveYamlOmap,
		construct: constructYamlOmap
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/pairs.js
var require_pairs = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	var _toString = Object.prototype.toString;
	function resolveYamlPairs(data) {
		if (data === null) return true;
		var index, length, pair, keys, result, object = data;
		result = new Array(object.length);
		for (index = 0, length = object.length; index < length; index += 1) {
			pair = object[index];
			if (_toString.call(pair) !== "[object Object]") return false;
			keys = Object.keys(pair);
			if (keys.length !== 1) return false;
			result[index] = [keys[0], pair[keys[0]]];
		}
		return true;
	}
	function constructYamlPairs(data) {
		if (data === null) return [];
		var index, length, pair, keys, result, object = data;
		result = new Array(object.length);
		for (index = 0, length = object.length; index < length; index += 1) {
			pair = object[index];
			keys = Object.keys(pair);
			result[index] = [keys[0], pair[keys[0]]];
		}
		return result;
	}
	module.exports = new Type("tag:yaml.org,2002:pairs", {
		kind: "sequence",
		resolve: resolveYamlPairs,
		construct: constructYamlPairs
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/set.js
var require_set = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	var _hasOwnProperty = Object.prototype.hasOwnProperty;
	function resolveYamlSet(data) {
		if (data === null) return true;
		var key, object = data;
		for (key in object) if (_hasOwnProperty.call(object, key)) {
			if (object[key] !== null) return false;
		}
		return true;
	}
	function constructYamlSet(data) {
		return data !== null ? data : {};
	}
	module.exports = new Type("tag:yaml.org,2002:set", {
		kind: "mapping",
		resolve: resolveYamlSet,
		construct: constructYamlSet
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/schema/default_safe.js
var require_default_safe = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_schema())({
		include: [require_core()],
		implicit: [require_timestamp(), require_merge()],
		explicit: [
			require_binary(),
			require_omap(),
			require_pairs(),
			require_set()
		]
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/js/undefined.js
var require_undefined = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	function resolveJavascriptUndefined() {
		return true;
	}
	function constructJavascriptUndefined() {}
	function representJavascriptUndefined() {
		return "";
	}
	function isUndefined(object) {
		return typeof object === "undefined";
	}
	module.exports = new Type("tag:yaml.org,2002:js/undefined", {
		kind: "scalar",
		resolve: resolveJavascriptUndefined,
		construct: constructJavascriptUndefined,
		predicate: isUndefined,
		represent: representJavascriptUndefined
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/js/regexp.js
var require_regexp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	function resolveJavascriptRegExp(data) {
		if (data === null) return false;
		if (data.length === 0) return false;
		var regexp = data, tail = /\/([gim]*)$/.exec(data), modifiers = "";
		if (regexp[0] === "/") {
			if (tail) modifiers = tail[1];
			if (modifiers.length > 3) return false;
			if (regexp[regexp.length - modifiers.length - 1] !== "/") return false;
		}
		return true;
	}
	function constructJavascriptRegExp(data) {
		var regexp = data, tail = /\/([gim]*)$/.exec(data), modifiers = "";
		if (regexp[0] === "/") {
			if (tail) modifiers = tail[1];
			regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
		}
		return new RegExp(regexp, modifiers);
	}
	function representJavascriptRegExp(object) {
		var result = "/" + object.source + "/";
		if (object.global) result += "g";
		if (object.multiline) result += "m";
		if (object.ignoreCase) result += "i";
		return result;
	}
	function isRegExp(object) {
		return Object.prototype.toString.call(object) === "[object RegExp]";
	}
	module.exports = new Type("tag:yaml.org,2002:js/regexp", {
		kind: "scalar",
		resolve: resolveJavascriptRegExp,
		construct: constructJavascriptRegExp,
		predicate: isRegExp,
		represent: representJavascriptRegExp
	});
}));
//#endregion
//#region node_modules/esprima/dist/esprima.js
var require_esprima = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function webpackUniversalModuleDefinition(root, factory) {
		/* istanbul ignore next */
		if (typeof exports === "object" && typeof module === "object") module.exports = factory();
		else if (typeof define === "function" && define.amd) define([], factory);
		else if (typeof exports === "object") exports["esprima"] = factory();
		else root["esprima"] = factory();
	})(exports, function() {
		return (function(modules) {
			var installedModules = {};
			function __webpack_require__(moduleId) {
				/* istanbul ignore if */
				if (installedModules[moduleId]) return installedModules[moduleId].exports;
				var module$1 = installedModules[moduleId] = {
					exports: {},
					id: moduleId,
					loaded: false
				};
				modules[moduleId].call(module$1.exports, module$1, module$1.exports, __webpack_require__);
				module$1.loaded = true;
				return module$1.exports;
			}
			__webpack_require__.m = modules;
			__webpack_require__.c = installedModules;
			__webpack_require__.p = "";
			return __webpack_require__(0);
		})([
			function(module$2, exports$1, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$1, "__esModule", { value: true });
				var comment_handler_1 = __webpack_require__(1);
				var jsx_parser_1 = __webpack_require__(3);
				var parser_1 = __webpack_require__(8);
				var tokenizer_1 = __webpack_require__(15);
				function parse(code, options, delegate) {
					var commentHandler = null;
					var proxyDelegate = function(node, metadata) {
						if (delegate) delegate(node, metadata);
						if (commentHandler) commentHandler.visit(node, metadata);
					};
					var parserDelegate = typeof delegate === "function" ? proxyDelegate : null;
					var collectComment = false;
					if (options) {
						collectComment = typeof options.comment === "boolean" && options.comment;
						var attachComment = typeof options.attachComment === "boolean" && options.attachComment;
						if (collectComment || attachComment) {
							commentHandler = new comment_handler_1.CommentHandler();
							commentHandler.attach = attachComment;
							options.comment = true;
							parserDelegate = proxyDelegate;
						}
					}
					var isModule = false;
					if (options && typeof options.sourceType === "string") isModule = options.sourceType === "module";
					var parser;
					if (options && typeof options.jsx === "boolean" && options.jsx) parser = new jsx_parser_1.JSXParser(code, options, parserDelegate);
					else parser = new parser_1.Parser(code, options, parserDelegate);
					var ast = isModule ? parser.parseModule() : parser.parseScript();
					if (collectComment && commentHandler) ast.comments = commentHandler.comments;
					if (parser.config.tokens) ast.tokens = parser.tokens;
					if (parser.config.tolerant) ast.errors = parser.errorHandler.errors;
					return ast;
				}
				exports$1.parse = parse;
				function parseModule(code, options, delegate) {
					var parsingOptions = options || {};
					parsingOptions.sourceType = "module";
					return parse(code, parsingOptions, delegate);
				}
				exports$1.parseModule = parseModule;
				function parseScript(code, options, delegate) {
					var parsingOptions = options || {};
					parsingOptions.sourceType = "script";
					return parse(code, parsingOptions, delegate);
				}
				exports$1.parseScript = parseScript;
				function tokenize(code, options, delegate) {
					var tokenizer = new tokenizer_1.Tokenizer(code, options);
					var tokens = [];
					try {
						while (true) {
							var token = tokenizer.getNextToken();
							if (!token) break;
							if (delegate) token = delegate(token);
							tokens.push(token);
						}
					} catch (e) {
						tokenizer.errorHandler.tolerate(e);
					}
					if (tokenizer.errorHandler.tolerant) tokens.errors = tokenizer.errors();
					return tokens;
				}
				exports$1.tokenize = tokenize;
				exports$1.Syntax = __webpack_require__(2).Syntax;
				exports$1.version = "4.0.1";
			},
			function(module$3, exports$2, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$2, "__esModule", { value: true });
				var syntax_1 = __webpack_require__(2);
				exports$2.CommentHandler = function() {
					function CommentHandler() {
						this.attach = false;
						this.comments = [];
						this.stack = [];
						this.leading = [];
						this.trailing = [];
					}
					CommentHandler.prototype.insertInnerComments = function(node, metadata) {
						if (node.type === syntax_1.Syntax.BlockStatement && node.body.length === 0) {
							var innerComments = [];
							for (var i = this.leading.length - 1; i >= 0; --i) {
								var entry = this.leading[i];
								if (metadata.end.offset >= entry.start) {
									innerComments.unshift(entry.comment);
									this.leading.splice(i, 1);
									this.trailing.splice(i, 1);
								}
							}
							if (innerComments.length) node.innerComments = innerComments;
						}
					};
					CommentHandler.prototype.findTrailingComments = function(metadata) {
						var trailingComments = [];
						if (this.trailing.length > 0) {
							for (var i = this.trailing.length - 1; i >= 0; --i) {
								var entry_1 = this.trailing[i];
								if (entry_1.start >= metadata.end.offset) trailingComments.unshift(entry_1.comment);
							}
							this.trailing.length = 0;
							return trailingComments;
						}
						var entry = this.stack[this.stack.length - 1];
						if (entry && entry.node.trailingComments) {
							var firstComment = entry.node.trailingComments[0];
							if (firstComment && firstComment.range[0] >= metadata.end.offset) {
								trailingComments = entry.node.trailingComments;
								delete entry.node.trailingComments;
							}
						}
						return trailingComments;
					};
					CommentHandler.prototype.findLeadingComments = function(metadata) {
						var leadingComments = [];
						var target;
						while (this.stack.length > 0) {
							var entry = this.stack[this.stack.length - 1];
							if (entry && entry.start >= metadata.start.offset) {
								target = entry.node;
								this.stack.pop();
							} else break;
						}
						if (target) {
							for (var i = (target.leadingComments ? target.leadingComments.length : 0) - 1; i >= 0; --i) {
								var comment = target.leadingComments[i];
								if (comment.range[1] <= metadata.start.offset) {
									leadingComments.unshift(comment);
									target.leadingComments.splice(i, 1);
								}
							}
							if (target.leadingComments && target.leadingComments.length === 0) delete target.leadingComments;
							return leadingComments;
						}
						for (var i = this.leading.length - 1; i >= 0; --i) {
							var entry = this.leading[i];
							if (entry.start <= metadata.start.offset) {
								leadingComments.unshift(entry.comment);
								this.leading.splice(i, 1);
							}
						}
						return leadingComments;
					};
					CommentHandler.prototype.visitNode = function(node, metadata) {
						if (node.type === syntax_1.Syntax.Program && node.body.length > 0) return;
						this.insertInnerComments(node, metadata);
						var trailingComments = this.findTrailingComments(metadata);
						var leadingComments = this.findLeadingComments(metadata);
						if (leadingComments.length > 0) node.leadingComments = leadingComments;
						if (trailingComments.length > 0) node.trailingComments = trailingComments;
						this.stack.push({
							node,
							start: metadata.start.offset
						});
					};
					CommentHandler.prototype.visitComment = function(node, metadata) {
						var type = node.type[0] === "L" ? "Line" : "Block";
						var comment = {
							type,
							value: node.value
						};
						if (node.range) comment.range = node.range;
						if (node.loc) comment.loc = node.loc;
						this.comments.push(comment);
						if (this.attach) {
							var entry = {
								comment: {
									type,
									value: node.value,
									range: [metadata.start.offset, metadata.end.offset]
								},
								start: metadata.start.offset
							};
							if (node.loc) entry.comment.loc = node.loc;
							node.type = type;
							this.leading.push(entry);
							this.trailing.push(entry);
						}
					};
					CommentHandler.prototype.visit = function(node, metadata) {
						if (node.type === "LineComment") this.visitComment(node, metadata);
						else if (node.type === "BlockComment") this.visitComment(node, metadata);
						else if (this.attach) this.visitNode(node, metadata);
					};
					return CommentHandler;
				}();
			},
			function(module$4, exports$3) {
				"use strict";
				Object.defineProperty(exports$3, "__esModule", { value: true });
				exports$3.Syntax = {
					AssignmentExpression: "AssignmentExpression",
					AssignmentPattern: "AssignmentPattern",
					ArrayExpression: "ArrayExpression",
					ArrayPattern: "ArrayPattern",
					ArrowFunctionExpression: "ArrowFunctionExpression",
					AwaitExpression: "AwaitExpression",
					BlockStatement: "BlockStatement",
					BinaryExpression: "BinaryExpression",
					BreakStatement: "BreakStatement",
					CallExpression: "CallExpression",
					CatchClause: "CatchClause",
					ClassBody: "ClassBody",
					ClassDeclaration: "ClassDeclaration",
					ClassExpression: "ClassExpression",
					ConditionalExpression: "ConditionalExpression",
					ContinueStatement: "ContinueStatement",
					DoWhileStatement: "DoWhileStatement",
					DebuggerStatement: "DebuggerStatement",
					EmptyStatement: "EmptyStatement",
					ExportAllDeclaration: "ExportAllDeclaration",
					ExportDefaultDeclaration: "ExportDefaultDeclaration",
					ExportNamedDeclaration: "ExportNamedDeclaration",
					ExportSpecifier: "ExportSpecifier",
					ExpressionStatement: "ExpressionStatement",
					ForStatement: "ForStatement",
					ForOfStatement: "ForOfStatement",
					ForInStatement: "ForInStatement",
					FunctionDeclaration: "FunctionDeclaration",
					FunctionExpression: "FunctionExpression",
					Identifier: "Identifier",
					IfStatement: "IfStatement",
					ImportDeclaration: "ImportDeclaration",
					ImportDefaultSpecifier: "ImportDefaultSpecifier",
					ImportNamespaceSpecifier: "ImportNamespaceSpecifier",
					ImportSpecifier: "ImportSpecifier",
					Literal: "Literal",
					LabeledStatement: "LabeledStatement",
					LogicalExpression: "LogicalExpression",
					MemberExpression: "MemberExpression",
					MetaProperty: "MetaProperty",
					MethodDefinition: "MethodDefinition",
					NewExpression: "NewExpression",
					ObjectExpression: "ObjectExpression",
					ObjectPattern: "ObjectPattern",
					Program: "Program",
					Property: "Property",
					RestElement: "RestElement",
					ReturnStatement: "ReturnStatement",
					SequenceExpression: "SequenceExpression",
					SpreadElement: "SpreadElement",
					Super: "Super",
					SwitchCase: "SwitchCase",
					SwitchStatement: "SwitchStatement",
					TaggedTemplateExpression: "TaggedTemplateExpression",
					TemplateElement: "TemplateElement",
					TemplateLiteral: "TemplateLiteral",
					ThisExpression: "ThisExpression",
					ThrowStatement: "ThrowStatement",
					TryStatement: "TryStatement",
					UnaryExpression: "UnaryExpression",
					UpdateExpression: "UpdateExpression",
					VariableDeclaration: "VariableDeclaration",
					VariableDeclarator: "VariableDeclarator",
					WhileStatement: "WhileStatement",
					WithStatement: "WithStatement",
					YieldExpression: "YieldExpression"
				};
			},
			function(module$5, exports$4, __webpack_require__) {
				"use strict";
				/* istanbul ignore next */
				var __extends = this && this.__extends || (function() {
					var extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d, b) {
						d.__proto__ = b;
					} || function(d, b) {
						for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
					};
					return function(d, b) {
						extendStatics(d, b);
						function __() {
							this.constructor = d;
						}
						d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
					};
				})();
				Object.defineProperty(exports$4, "__esModule", { value: true });
				var character_1 = __webpack_require__(4);
				var JSXNode = __webpack_require__(5);
				var jsx_syntax_1 = __webpack_require__(6);
				var Node = __webpack_require__(7);
				var parser_1 = __webpack_require__(8);
				var token_1 = __webpack_require__(13);
				var xhtml_entities_1 = __webpack_require__(14);
				token_1.TokenName[100] = "JSXIdentifier";
				token_1.TokenName[101] = "JSXText";
				function getQualifiedElementName(elementName) {
					var qualifiedName;
					switch (elementName.type) {
						case jsx_syntax_1.JSXSyntax.JSXIdentifier:
							qualifiedName = elementName.name;
							break;
						case jsx_syntax_1.JSXSyntax.JSXNamespacedName:
							var ns = elementName;
							qualifiedName = getQualifiedElementName(ns.namespace) + ":" + getQualifiedElementName(ns.name);
							break;
						case jsx_syntax_1.JSXSyntax.JSXMemberExpression:
							var expr = elementName;
							qualifiedName = getQualifiedElementName(expr.object) + "." + getQualifiedElementName(expr.property);
							break;
						/* istanbul ignore next */
						default: break;
					}
					return qualifiedName;
				}
				exports$4.JSXParser = function(_super) {
					__extends(JSXParser, _super);
					function JSXParser(code, options, delegate) {
						return _super.call(this, code, options, delegate) || this;
					}
					JSXParser.prototype.parsePrimaryExpression = function() {
						return this.match("<") ? this.parseJSXRoot() : _super.prototype.parsePrimaryExpression.call(this);
					};
					JSXParser.prototype.startJSX = function() {
						this.scanner.index = this.startMarker.index;
						this.scanner.lineNumber = this.startMarker.line;
						this.scanner.lineStart = this.startMarker.index - this.startMarker.column;
					};
					JSXParser.prototype.finishJSX = function() {
						this.nextToken();
					};
					JSXParser.prototype.reenterJSX = function() {
						this.startJSX();
						this.expectJSX("}");
						if (this.config.tokens) this.tokens.pop();
					};
					JSXParser.prototype.createJSXNode = function() {
						this.collectComments();
						return {
							index: this.scanner.index,
							line: this.scanner.lineNumber,
							column: this.scanner.index - this.scanner.lineStart
						};
					};
					JSXParser.prototype.createJSXChildNode = function() {
						return {
							index: this.scanner.index,
							line: this.scanner.lineNumber,
							column: this.scanner.index - this.scanner.lineStart
						};
					};
					JSXParser.prototype.scanXHTMLEntity = function(quote) {
						var result = "&";
						var valid = true;
						var terminated = false;
						var numeric = false;
						var hex = false;
						while (!this.scanner.eof() && valid && !terminated) {
							var ch = this.scanner.source[this.scanner.index];
							if (ch === quote) break;
							terminated = ch === ";";
							result += ch;
							++this.scanner.index;
							if (!terminated) switch (result.length) {
								case 2:
									numeric = ch === "#";
									break;
								case 3:
									if (numeric) {
										hex = ch === "x";
										valid = hex || character_1.Character.isDecimalDigit(ch.charCodeAt(0));
										numeric = numeric && !hex;
									}
									break;
								default:
									valid = valid && !(numeric && !character_1.Character.isDecimalDigit(ch.charCodeAt(0)));
									valid = valid && !(hex && !character_1.Character.isHexDigit(ch.charCodeAt(0)));
									break;
							}
						}
						if (valid && terminated && result.length > 2) {
							var str = result.substr(1, result.length - 2);
							if (numeric && str.length > 1) result = String.fromCharCode(parseInt(str.substr(1), 10));
							else if (hex && str.length > 2) result = String.fromCharCode(parseInt("0" + str.substr(1), 16));
							else if (!numeric && !hex && xhtml_entities_1.XHTMLEntities[str]) result = xhtml_entities_1.XHTMLEntities[str];
						}
						return result;
					};
					JSXParser.prototype.lexJSX = function() {
						var cp = this.scanner.source.charCodeAt(this.scanner.index);
						if (cp === 60 || cp === 62 || cp === 47 || cp === 58 || cp === 61 || cp === 123 || cp === 125) {
							var value = this.scanner.source[this.scanner.index++];
							return {
								type: 7,
								value,
								lineNumber: this.scanner.lineNumber,
								lineStart: this.scanner.lineStart,
								start: this.scanner.index - 1,
								end: this.scanner.index
							};
						}
						if (cp === 34 || cp === 39) {
							var start = this.scanner.index;
							var quote = this.scanner.source[this.scanner.index++];
							var str = "";
							while (!this.scanner.eof()) {
								var ch = this.scanner.source[this.scanner.index++];
								if (ch === quote) break;
								else if (ch === "&") str += this.scanXHTMLEntity(quote);
								else str += ch;
							}
							return {
								type: 8,
								value: str,
								lineNumber: this.scanner.lineNumber,
								lineStart: this.scanner.lineStart,
								start,
								end: this.scanner.index
							};
						}
						if (cp === 46) {
							var n1 = this.scanner.source.charCodeAt(this.scanner.index + 1);
							var n2 = this.scanner.source.charCodeAt(this.scanner.index + 2);
							var value = n1 === 46 && n2 === 46 ? "..." : ".";
							var start = this.scanner.index;
							this.scanner.index += value.length;
							return {
								type: 7,
								value,
								lineNumber: this.scanner.lineNumber,
								lineStart: this.scanner.lineStart,
								start,
								end: this.scanner.index
							};
						}
						if (cp === 96) return {
							type: 10,
							value: "",
							lineNumber: this.scanner.lineNumber,
							lineStart: this.scanner.lineStart,
							start: this.scanner.index,
							end: this.scanner.index
						};
						if (character_1.Character.isIdentifierStart(cp) && cp !== 92) {
							var start = this.scanner.index;
							++this.scanner.index;
							while (!this.scanner.eof()) {
								var ch = this.scanner.source.charCodeAt(this.scanner.index);
								if (character_1.Character.isIdentifierPart(ch) && ch !== 92) ++this.scanner.index;
								else if (ch === 45) ++this.scanner.index;
								else break;
							}
							return {
								type: 100,
								value: this.scanner.source.slice(start, this.scanner.index),
								lineNumber: this.scanner.lineNumber,
								lineStart: this.scanner.lineStart,
								start,
								end: this.scanner.index
							};
						}
						return this.scanner.lex();
					};
					JSXParser.prototype.nextJSXToken = function() {
						this.collectComments();
						this.startMarker.index = this.scanner.index;
						this.startMarker.line = this.scanner.lineNumber;
						this.startMarker.column = this.scanner.index - this.scanner.lineStart;
						var token = this.lexJSX();
						this.lastMarker.index = this.scanner.index;
						this.lastMarker.line = this.scanner.lineNumber;
						this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
						if (this.config.tokens) this.tokens.push(this.convertToken(token));
						return token;
					};
					JSXParser.prototype.nextJSXText = function() {
						this.startMarker.index = this.scanner.index;
						this.startMarker.line = this.scanner.lineNumber;
						this.startMarker.column = this.scanner.index - this.scanner.lineStart;
						var start = this.scanner.index;
						var text = "";
						while (!this.scanner.eof()) {
							var ch = this.scanner.source[this.scanner.index];
							if (ch === "{" || ch === "<") break;
							++this.scanner.index;
							text += ch;
							if (character_1.Character.isLineTerminator(ch.charCodeAt(0))) {
								++this.scanner.lineNumber;
								if (ch === "\r" && this.scanner.source[this.scanner.index] === "\n") ++this.scanner.index;
								this.scanner.lineStart = this.scanner.index;
							}
						}
						this.lastMarker.index = this.scanner.index;
						this.lastMarker.line = this.scanner.lineNumber;
						this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
						var token = {
							type: 101,
							value: text,
							lineNumber: this.scanner.lineNumber,
							lineStart: this.scanner.lineStart,
							start,
							end: this.scanner.index
						};
						if (text.length > 0 && this.config.tokens) this.tokens.push(this.convertToken(token));
						return token;
					};
					JSXParser.prototype.peekJSXToken = function() {
						var state = this.scanner.saveState();
						this.scanner.scanComments();
						var next = this.lexJSX();
						this.scanner.restoreState(state);
						return next;
					};
					JSXParser.prototype.expectJSX = function(value) {
						var token = this.nextJSXToken();
						if (token.type !== 7 || token.value !== value) this.throwUnexpectedToken(token);
					};
					JSXParser.prototype.matchJSX = function(value) {
						var next = this.peekJSXToken();
						return next.type === 7 && next.value === value;
					};
					JSXParser.prototype.parseJSXIdentifier = function() {
						var node = this.createJSXNode();
						var token = this.nextJSXToken();
						if (token.type !== 100) this.throwUnexpectedToken(token);
						return this.finalize(node, new JSXNode.JSXIdentifier(token.value));
					};
					JSXParser.prototype.parseJSXElementName = function() {
						var node = this.createJSXNode();
						var elementName = this.parseJSXIdentifier();
						if (this.matchJSX(":")) {
							var namespace = elementName;
							this.expectJSX(":");
							var name_1 = this.parseJSXIdentifier();
							elementName = this.finalize(node, new JSXNode.JSXNamespacedName(namespace, name_1));
						} else if (this.matchJSX(".")) while (this.matchJSX(".")) {
							var object = elementName;
							this.expectJSX(".");
							var property = this.parseJSXIdentifier();
							elementName = this.finalize(node, new JSXNode.JSXMemberExpression(object, property));
						}
						return elementName;
					};
					JSXParser.prototype.parseJSXAttributeName = function() {
						var node = this.createJSXNode();
						var attributeName;
						var identifier = this.parseJSXIdentifier();
						if (this.matchJSX(":")) {
							var namespace = identifier;
							this.expectJSX(":");
							var name_2 = this.parseJSXIdentifier();
							attributeName = this.finalize(node, new JSXNode.JSXNamespacedName(namespace, name_2));
						} else attributeName = identifier;
						return attributeName;
					};
					JSXParser.prototype.parseJSXStringLiteralAttribute = function() {
						var node = this.createJSXNode();
						var token = this.nextJSXToken();
						if (token.type !== 8) this.throwUnexpectedToken(token);
						var raw = this.getTokenRaw(token);
						return this.finalize(node, new Node.Literal(token.value, raw));
					};
					JSXParser.prototype.parseJSXExpressionAttribute = function() {
						var node = this.createJSXNode();
						this.expectJSX("{");
						this.finishJSX();
						if (this.match("}")) this.tolerateError("JSX attributes must only be assigned a non-empty expression");
						var expression = this.parseAssignmentExpression();
						this.reenterJSX();
						return this.finalize(node, new JSXNode.JSXExpressionContainer(expression));
					};
					JSXParser.prototype.parseJSXAttributeValue = function() {
						return this.matchJSX("{") ? this.parseJSXExpressionAttribute() : this.matchJSX("<") ? this.parseJSXElement() : this.parseJSXStringLiteralAttribute();
					};
					JSXParser.prototype.parseJSXNameValueAttribute = function() {
						var node = this.createJSXNode();
						var name = this.parseJSXAttributeName();
						var value = null;
						if (this.matchJSX("=")) {
							this.expectJSX("=");
							value = this.parseJSXAttributeValue();
						}
						return this.finalize(node, new JSXNode.JSXAttribute(name, value));
					};
					JSXParser.prototype.parseJSXSpreadAttribute = function() {
						var node = this.createJSXNode();
						this.expectJSX("{");
						this.expectJSX("...");
						this.finishJSX();
						var argument = this.parseAssignmentExpression();
						this.reenterJSX();
						return this.finalize(node, new JSXNode.JSXSpreadAttribute(argument));
					};
					JSXParser.prototype.parseJSXAttributes = function() {
						var attributes = [];
						while (!this.matchJSX("/") && !this.matchJSX(">")) {
							var attribute = this.matchJSX("{") ? this.parseJSXSpreadAttribute() : this.parseJSXNameValueAttribute();
							attributes.push(attribute);
						}
						return attributes;
					};
					JSXParser.prototype.parseJSXOpeningElement = function() {
						var node = this.createJSXNode();
						this.expectJSX("<");
						var name = this.parseJSXElementName();
						var attributes = this.parseJSXAttributes();
						var selfClosing = this.matchJSX("/");
						if (selfClosing) this.expectJSX("/");
						this.expectJSX(">");
						return this.finalize(node, new JSXNode.JSXOpeningElement(name, selfClosing, attributes));
					};
					JSXParser.prototype.parseJSXBoundaryElement = function() {
						var node = this.createJSXNode();
						this.expectJSX("<");
						if (this.matchJSX("/")) {
							this.expectJSX("/");
							var name_3 = this.parseJSXElementName();
							this.expectJSX(">");
							return this.finalize(node, new JSXNode.JSXClosingElement(name_3));
						}
						var name = this.parseJSXElementName();
						var attributes = this.parseJSXAttributes();
						var selfClosing = this.matchJSX("/");
						if (selfClosing) this.expectJSX("/");
						this.expectJSX(">");
						return this.finalize(node, new JSXNode.JSXOpeningElement(name, selfClosing, attributes));
					};
					JSXParser.prototype.parseJSXEmptyExpression = function() {
						var node = this.createJSXChildNode();
						this.collectComments();
						this.lastMarker.index = this.scanner.index;
						this.lastMarker.line = this.scanner.lineNumber;
						this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
						return this.finalize(node, new JSXNode.JSXEmptyExpression());
					};
					JSXParser.prototype.parseJSXExpressionContainer = function() {
						var node = this.createJSXNode();
						this.expectJSX("{");
						var expression;
						if (this.matchJSX("}")) {
							expression = this.parseJSXEmptyExpression();
							this.expectJSX("}");
						} else {
							this.finishJSX();
							expression = this.parseAssignmentExpression();
							this.reenterJSX();
						}
						return this.finalize(node, new JSXNode.JSXExpressionContainer(expression));
					};
					JSXParser.prototype.parseJSXChildren = function() {
						var children = [];
						while (!this.scanner.eof()) {
							var node = this.createJSXChildNode();
							var token = this.nextJSXText();
							if (token.start < token.end) {
								var raw = this.getTokenRaw(token);
								var child = this.finalize(node, new JSXNode.JSXText(token.value, raw));
								children.push(child);
							}
							if (this.scanner.source[this.scanner.index] === "{") {
								var container = this.parseJSXExpressionContainer();
								children.push(container);
							} else break;
						}
						return children;
					};
					JSXParser.prototype.parseComplexJSXElement = function(el) {
						var stack = [];
						while (!this.scanner.eof()) {
							el.children = el.children.concat(this.parseJSXChildren());
							var node = this.createJSXChildNode();
							var element = this.parseJSXBoundaryElement();
							if (element.type === jsx_syntax_1.JSXSyntax.JSXOpeningElement) {
								var opening = element;
								if (opening.selfClosing) {
									var child = this.finalize(node, new JSXNode.JSXElement(opening, [], null));
									el.children.push(child);
								} else {
									stack.push(el);
									el = {
										node,
										opening,
										closing: null,
										children: []
									};
								}
							}
							if (element.type === jsx_syntax_1.JSXSyntax.JSXClosingElement) {
								el.closing = element;
								var open_1 = getQualifiedElementName(el.opening.name);
								if (open_1 !== getQualifiedElementName(el.closing.name)) this.tolerateError("Expected corresponding JSX closing tag for %0", open_1);
								if (stack.length > 0) {
									var child = this.finalize(el.node, new JSXNode.JSXElement(el.opening, el.children, el.closing));
									el = stack[stack.length - 1];
									el.children.push(child);
									stack.pop();
								} else break;
							}
						}
						return el;
					};
					JSXParser.prototype.parseJSXElement = function() {
						var node = this.createJSXNode();
						var opening = this.parseJSXOpeningElement();
						var children = [];
						var closing = null;
						if (!opening.selfClosing) {
							var el = this.parseComplexJSXElement({
								node,
								opening,
								closing,
								children
							});
							children = el.children;
							closing = el.closing;
						}
						return this.finalize(node, new JSXNode.JSXElement(opening, children, closing));
					};
					JSXParser.prototype.parseJSXRoot = function() {
						if (this.config.tokens) this.tokens.pop();
						this.startJSX();
						var element = this.parseJSXElement();
						this.finishJSX();
						return element;
					};
					JSXParser.prototype.isStartOfExpression = function() {
						return _super.prototype.isStartOfExpression.call(this) || this.match("<");
					};
					return JSXParser;
				}(parser_1.Parser);
			},
			function(module$6, exports$5) {
				"use strict";
				Object.defineProperty(exports$5, "__esModule", { value: true });
				var Regex = {
					NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]/,
					NonAsciiIdentifierPart: /[\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/
				};
				exports$5.Character = {
					fromCodePoint: function(cp) {
						return cp < 65536 ? String.fromCharCode(cp) : String.fromCharCode(55296 + (cp - 65536 >> 10)) + String.fromCharCode(56320 + (cp - 65536 & 1023));
					},
					isWhiteSpace: function(cp) {
						return cp === 32 || cp === 9 || cp === 11 || cp === 12 || cp === 160 || cp >= 5760 && [
							5760,
							8192,
							8193,
							8194,
							8195,
							8196,
							8197,
							8198,
							8199,
							8200,
							8201,
							8202,
							8239,
							8287,
							12288,
							65279
						].indexOf(cp) >= 0;
					},
					isLineTerminator: function(cp) {
						return cp === 10 || cp === 13 || cp === 8232 || cp === 8233;
					},
					isIdentifierStart: function(cp) {
						return cp === 36 || cp === 95 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp === 92 || cp >= 128 && Regex.NonAsciiIdentifierStart.test(exports$5.Character.fromCodePoint(cp));
					},
					isIdentifierPart: function(cp) {
						return cp === 36 || cp === 95 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp >= 48 && cp <= 57 || cp === 92 || cp >= 128 && Regex.NonAsciiIdentifierPart.test(exports$5.Character.fromCodePoint(cp));
					},
					isDecimalDigit: function(cp) {
						return cp >= 48 && cp <= 57;
					},
					isHexDigit: function(cp) {
						return cp >= 48 && cp <= 57 || cp >= 65 && cp <= 70 || cp >= 97 && cp <= 102;
					},
					isOctalDigit: function(cp) {
						return cp >= 48 && cp <= 55;
					}
				};
			},
			function(module$7, exports$6, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$6, "__esModule", { value: true });
				var jsx_syntax_1 = __webpack_require__(6);
				exports$6.JSXClosingElement = function() {
					function JSXClosingElement(name) {
						this.type = jsx_syntax_1.JSXSyntax.JSXClosingElement;
						this.name = name;
					}
					return JSXClosingElement;
				}();
				exports$6.JSXElement = function() {
					function JSXElement(openingElement, children, closingElement) {
						this.type = jsx_syntax_1.JSXSyntax.JSXElement;
						this.openingElement = openingElement;
						this.children = children;
						this.closingElement = closingElement;
					}
					return JSXElement;
				}();
				exports$6.JSXEmptyExpression = function() {
					function JSXEmptyExpression() {
						this.type = jsx_syntax_1.JSXSyntax.JSXEmptyExpression;
					}
					return JSXEmptyExpression;
				}();
				exports$6.JSXExpressionContainer = function() {
					function JSXExpressionContainer(expression) {
						this.type = jsx_syntax_1.JSXSyntax.JSXExpressionContainer;
						this.expression = expression;
					}
					return JSXExpressionContainer;
				}();
				exports$6.JSXIdentifier = function() {
					function JSXIdentifier(name) {
						this.type = jsx_syntax_1.JSXSyntax.JSXIdentifier;
						this.name = name;
					}
					return JSXIdentifier;
				}();
				exports$6.JSXMemberExpression = function() {
					function JSXMemberExpression(object, property) {
						this.type = jsx_syntax_1.JSXSyntax.JSXMemberExpression;
						this.object = object;
						this.property = property;
					}
					return JSXMemberExpression;
				}();
				exports$6.JSXAttribute = function() {
					function JSXAttribute(name, value) {
						this.type = jsx_syntax_1.JSXSyntax.JSXAttribute;
						this.name = name;
						this.value = value;
					}
					return JSXAttribute;
				}();
				exports$6.JSXNamespacedName = function() {
					function JSXNamespacedName(namespace, name) {
						this.type = jsx_syntax_1.JSXSyntax.JSXNamespacedName;
						this.namespace = namespace;
						this.name = name;
					}
					return JSXNamespacedName;
				}();
				exports$6.JSXOpeningElement = function() {
					function JSXOpeningElement(name, selfClosing, attributes) {
						this.type = jsx_syntax_1.JSXSyntax.JSXOpeningElement;
						this.name = name;
						this.selfClosing = selfClosing;
						this.attributes = attributes;
					}
					return JSXOpeningElement;
				}();
				exports$6.JSXSpreadAttribute = function() {
					function JSXSpreadAttribute(argument) {
						this.type = jsx_syntax_1.JSXSyntax.JSXSpreadAttribute;
						this.argument = argument;
					}
					return JSXSpreadAttribute;
				}();
				exports$6.JSXText = function() {
					function JSXText(value, raw) {
						this.type = jsx_syntax_1.JSXSyntax.JSXText;
						this.value = value;
						this.raw = raw;
					}
					return JSXText;
				}();
			},
			function(module$8, exports$7) {
				"use strict";
				Object.defineProperty(exports$7, "__esModule", { value: true });
				exports$7.JSXSyntax = {
					JSXAttribute: "JSXAttribute",
					JSXClosingElement: "JSXClosingElement",
					JSXElement: "JSXElement",
					JSXEmptyExpression: "JSXEmptyExpression",
					JSXExpressionContainer: "JSXExpressionContainer",
					JSXIdentifier: "JSXIdentifier",
					JSXMemberExpression: "JSXMemberExpression",
					JSXNamespacedName: "JSXNamespacedName",
					JSXOpeningElement: "JSXOpeningElement",
					JSXSpreadAttribute: "JSXSpreadAttribute",
					JSXText: "JSXText"
				};
			},
			function(module$9, exports$8, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$8, "__esModule", { value: true });
				var syntax_1 = __webpack_require__(2);
				exports$8.ArrayExpression = function() {
					function ArrayExpression(elements) {
						this.type = syntax_1.Syntax.ArrayExpression;
						this.elements = elements;
					}
					return ArrayExpression;
				}();
				exports$8.ArrayPattern = function() {
					function ArrayPattern(elements) {
						this.type = syntax_1.Syntax.ArrayPattern;
						this.elements = elements;
					}
					return ArrayPattern;
				}();
				exports$8.ArrowFunctionExpression = function() {
					function ArrowFunctionExpression(params, body, expression) {
						this.type = syntax_1.Syntax.ArrowFunctionExpression;
						this.id = null;
						this.params = params;
						this.body = body;
						this.generator = false;
						this.expression = expression;
						this.async = false;
					}
					return ArrowFunctionExpression;
				}();
				exports$8.AssignmentExpression = function() {
					function AssignmentExpression(operator, left, right) {
						this.type = syntax_1.Syntax.AssignmentExpression;
						this.operator = operator;
						this.left = left;
						this.right = right;
					}
					return AssignmentExpression;
				}();
				exports$8.AssignmentPattern = function() {
					function AssignmentPattern(left, right) {
						this.type = syntax_1.Syntax.AssignmentPattern;
						this.left = left;
						this.right = right;
					}
					return AssignmentPattern;
				}();
				exports$8.AsyncArrowFunctionExpression = function() {
					function AsyncArrowFunctionExpression(params, body, expression) {
						this.type = syntax_1.Syntax.ArrowFunctionExpression;
						this.id = null;
						this.params = params;
						this.body = body;
						this.generator = false;
						this.expression = expression;
						this.async = true;
					}
					return AsyncArrowFunctionExpression;
				}();
				exports$8.AsyncFunctionDeclaration = function() {
					function AsyncFunctionDeclaration(id, params, body) {
						this.type = syntax_1.Syntax.FunctionDeclaration;
						this.id = id;
						this.params = params;
						this.body = body;
						this.generator = false;
						this.expression = false;
						this.async = true;
					}
					return AsyncFunctionDeclaration;
				}();
				exports$8.AsyncFunctionExpression = function() {
					function AsyncFunctionExpression(id, params, body) {
						this.type = syntax_1.Syntax.FunctionExpression;
						this.id = id;
						this.params = params;
						this.body = body;
						this.generator = false;
						this.expression = false;
						this.async = true;
					}
					return AsyncFunctionExpression;
				}();
				exports$8.AwaitExpression = function() {
					function AwaitExpression(argument) {
						this.type = syntax_1.Syntax.AwaitExpression;
						this.argument = argument;
					}
					return AwaitExpression;
				}();
				exports$8.BinaryExpression = function() {
					function BinaryExpression(operator, left, right) {
						var logical = operator === "||" || operator === "&&";
						this.type = logical ? syntax_1.Syntax.LogicalExpression : syntax_1.Syntax.BinaryExpression;
						this.operator = operator;
						this.left = left;
						this.right = right;
					}
					return BinaryExpression;
				}();
				exports$8.BlockStatement = function() {
					function BlockStatement(body) {
						this.type = syntax_1.Syntax.BlockStatement;
						this.body = body;
					}
					return BlockStatement;
				}();
				exports$8.BreakStatement = function() {
					function BreakStatement(label) {
						this.type = syntax_1.Syntax.BreakStatement;
						this.label = label;
					}
					return BreakStatement;
				}();
				exports$8.CallExpression = function() {
					function CallExpression(callee, args) {
						this.type = syntax_1.Syntax.CallExpression;
						this.callee = callee;
						this.arguments = args;
					}
					return CallExpression;
				}();
				exports$8.CatchClause = function() {
					function CatchClause(param, body) {
						this.type = syntax_1.Syntax.CatchClause;
						this.param = param;
						this.body = body;
					}
					return CatchClause;
				}();
				exports$8.ClassBody = function() {
					function ClassBody(body) {
						this.type = syntax_1.Syntax.ClassBody;
						this.body = body;
					}
					return ClassBody;
				}();
				exports$8.ClassDeclaration = function() {
					function ClassDeclaration(id, superClass, body) {
						this.type = syntax_1.Syntax.ClassDeclaration;
						this.id = id;
						this.superClass = superClass;
						this.body = body;
					}
					return ClassDeclaration;
				}();
				exports$8.ClassExpression = function() {
					function ClassExpression(id, superClass, body) {
						this.type = syntax_1.Syntax.ClassExpression;
						this.id = id;
						this.superClass = superClass;
						this.body = body;
					}
					return ClassExpression;
				}();
				exports$8.ComputedMemberExpression = function() {
					function ComputedMemberExpression(object, property) {
						this.type = syntax_1.Syntax.MemberExpression;
						this.computed = true;
						this.object = object;
						this.property = property;
					}
					return ComputedMemberExpression;
				}();
				exports$8.ConditionalExpression = function() {
					function ConditionalExpression(test, consequent, alternate) {
						this.type = syntax_1.Syntax.ConditionalExpression;
						this.test = test;
						this.consequent = consequent;
						this.alternate = alternate;
					}
					return ConditionalExpression;
				}();
				exports$8.ContinueStatement = function() {
					function ContinueStatement(label) {
						this.type = syntax_1.Syntax.ContinueStatement;
						this.label = label;
					}
					return ContinueStatement;
				}();
				exports$8.DebuggerStatement = function() {
					function DebuggerStatement() {
						this.type = syntax_1.Syntax.DebuggerStatement;
					}
					return DebuggerStatement;
				}();
				exports$8.Directive = function() {
					function Directive(expression, directive) {
						this.type = syntax_1.Syntax.ExpressionStatement;
						this.expression = expression;
						this.directive = directive;
					}
					return Directive;
				}();
				exports$8.DoWhileStatement = function() {
					function DoWhileStatement(body, test) {
						this.type = syntax_1.Syntax.DoWhileStatement;
						this.body = body;
						this.test = test;
					}
					return DoWhileStatement;
				}();
				exports$8.EmptyStatement = function() {
					function EmptyStatement() {
						this.type = syntax_1.Syntax.EmptyStatement;
					}
					return EmptyStatement;
				}();
				exports$8.ExportAllDeclaration = function() {
					function ExportAllDeclaration(source) {
						this.type = syntax_1.Syntax.ExportAllDeclaration;
						this.source = source;
					}
					return ExportAllDeclaration;
				}();
				exports$8.ExportDefaultDeclaration = function() {
					function ExportDefaultDeclaration(declaration) {
						this.type = syntax_1.Syntax.ExportDefaultDeclaration;
						this.declaration = declaration;
					}
					return ExportDefaultDeclaration;
				}();
				exports$8.ExportNamedDeclaration = function() {
					function ExportNamedDeclaration(declaration, specifiers, source) {
						this.type = syntax_1.Syntax.ExportNamedDeclaration;
						this.declaration = declaration;
						this.specifiers = specifiers;
						this.source = source;
					}
					return ExportNamedDeclaration;
				}();
				exports$8.ExportSpecifier = function() {
					function ExportSpecifier(local, exported) {
						this.type = syntax_1.Syntax.ExportSpecifier;
						this.exported = exported;
						this.local = local;
					}
					return ExportSpecifier;
				}();
				exports$8.ExpressionStatement = function() {
					function ExpressionStatement(expression) {
						this.type = syntax_1.Syntax.ExpressionStatement;
						this.expression = expression;
					}
					return ExpressionStatement;
				}();
				exports$8.ForInStatement = function() {
					function ForInStatement(left, right, body) {
						this.type = syntax_1.Syntax.ForInStatement;
						this.left = left;
						this.right = right;
						this.body = body;
						this.each = false;
					}
					return ForInStatement;
				}();
				exports$8.ForOfStatement = function() {
					function ForOfStatement(left, right, body) {
						this.type = syntax_1.Syntax.ForOfStatement;
						this.left = left;
						this.right = right;
						this.body = body;
					}
					return ForOfStatement;
				}();
				exports$8.ForStatement = function() {
					function ForStatement(init, test, update, body) {
						this.type = syntax_1.Syntax.ForStatement;
						this.init = init;
						this.test = test;
						this.update = update;
						this.body = body;
					}
					return ForStatement;
				}();
				exports$8.FunctionDeclaration = function() {
					function FunctionDeclaration(id, params, body, generator) {
						this.type = syntax_1.Syntax.FunctionDeclaration;
						this.id = id;
						this.params = params;
						this.body = body;
						this.generator = generator;
						this.expression = false;
						this.async = false;
					}
					return FunctionDeclaration;
				}();
				exports$8.FunctionExpression = function() {
					function FunctionExpression(id, params, body, generator) {
						this.type = syntax_1.Syntax.FunctionExpression;
						this.id = id;
						this.params = params;
						this.body = body;
						this.generator = generator;
						this.expression = false;
						this.async = false;
					}
					return FunctionExpression;
				}();
				exports$8.Identifier = function() {
					function Identifier(name) {
						this.type = syntax_1.Syntax.Identifier;
						this.name = name;
					}
					return Identifier;
				}();
				exports$8.IfStatement = function() {
					function IfStatement(test, consequent, alternate) {
						this.type = syntax_1.Syntax.IfStatement;
						this.test = test;
						this.consequent = consequent;
						this.alternate = alternate;
					}
					return IfStatement;
				}();
				exports$8.ImportDeclaration = function() {
					function ImportDeclaration(specifiers, source) {
						this.type = syntax_1.Syntax.ImportDeclaration;
						this.specifiers = specifiers;
						this.source = source;
					}
					return ImportDeclaration;
				}();
				exports$8.ImportDefaultSpecifier = function() {
					function ImportDefaultSpecifier(local) {
						this.type = syntax_1.Syntax.ImportDefaultSpecifier;
						this.local = local;
					}
					return ImportDefaultSpecifier;
				}();
				exports$8.ImportNamespaceSpecifier = function() {
					function ImportNamespaceSpecifier(local) {
						this.type = syntax_1.Syntax.ImportNamespaceSpecifier;
						this.local = local;
					}
					return ImportNamespaceSpecifier;
				}();
				exports$8.ImportSpecifier = function() {
					function ImportSpecifier(local, imported) {
						this.type = syntax_1.Syntax.ImportSpecifier;
						this.local = local;
						this.imported = imported;
					}
					return ImportSpecifier;
				}();
				exports$8.LabeledStatement = function() {
					function LabeledStatement(label, body) {
						this.type = syntax_1.Syntax.LabeledStatement;
						this.label = label;
						this.body = body;
					}
					return LabeledStatement;
				}();
				exports$8.Literal = function() {
					function Literal(value, raw) {
						this.type = syntax_1.Syntax.Literal;
						this.value = value;
						this.raw = raw;
					}
					return Literal;
				}();
				exports$8.MetaProperty = function() {
					function MetaProperty(meta, property) {
						this.type = syntax_1.Syntax.MetaProperty;
						this.meta = meta;
						this.property = property;
					}
					return MetaProperty;
				}();
				exports$8.MethodDefinition = function() {
					function MethodDefinition(key, computed, value, kind, isStatic) {
						this.type = syntax_1.Syntax.MethodDefinition;
						this.key = key;
						this.computed = computed;
						this.value = value;
						this.kind = kind;
						this.static = isStatic;
					}
					return MethodDefinition;
				}();
				exports$8.Module = function() {
					function Module(body) {
						this.type = syntax_1.Syntax.Program;
						this.body = body;
						this.sourceType = "module";
					}
					return Module;
				}();
				exports$8.NewExpression = function() {
					function NewExpression(callee, args) {
						this.type = syntax_1.Syntax.NewExpression;
						this.callee = callee;
						this.arguments = args;
					}
					return NewExpression;
				}();
				exports$8.ObjectExpression = function() {
					function ObjectExpression(properties) {
						this.type = syntax_1.Syntax.ObjectExpression;
						this.properties = properties;
					}
					return ObjectExpression;
				}();
				exports$8.ObjectPattern = function() {
					function ObjectPattern(properties) {
						this.type = syntax_1.Syntax.ObjectPattern;
						this.properties = properties;
					}
					return ObjectPattern;
				}();
				exports$8.Property = function() {
					function Property(kind, key, computed, value, method, shorthand) {
						this.type = syntax_1.Syntax.Property;
						this.key = key;
						this.computed = computed;
						this.value = value;
						this.kind = kind;
						this.method = method;
						this.shorthand = shorthand;
					}
					return Property;
				}();
				exports$8.RegexLiteral = function() {
					function RegexLiteral(value, raw, pattern, flags) {
						this.type = syntax_1.Syntax.Literal;
						this.value = value;
						this.raw = raw;
						this.regex = {
							pattern,
							flags
						};
					}
					return RegexLiteral;
				}();
				exports$8.RestElement = function() {
					function RestElement(argument) {
						this.type = syntax_1.Syntax.RestElement;
						this.argument = argument;
					}
					return RestElement;
				}();
				exports$8.ReturnStatement = function() {
					function ReturnStatement(argument) {
						this.type = syntax_1.Syntax.ReturnStatement;
						this.argument = argument;
					}
					return ReturnStatement;
				}();
				exports$8.Script = function() {
					function Script(body) {
						this.type = syntax_1.Syntax.Program;
						this.body = body;
						this.sourceType = "script";
					}
					return Script;
				}();
				exports$8.SequenceExpression = function() {
					function SequenceExpression(expressions) {
						this.type = syntax_1.Syntax.SequenceExpression;
						this.expressions = expressions;
					}
					return SequenceExpression;
				}();
				exports$8.SpreadElement = function() {
					function SpreadElement(argument) {
						this.type = syntax_1.Syntax.SpreadElement;
						this.argument = argument;
					}
					return SpreadElement;
				}();
				exports$8.StaticMemberExpression = function() {
					function StaticMemberExpression(object, property) {
						this.type = syntax_1.Syntax.MemberExpression;
						this.computed = false;
						this.object = object;
						this.property = property;
					}
					return StaticMemberExpression;
				}();
				exports$8.Super = function() {
					function Super() {
						this.type = syntax_1.Syntax.Super;
					}
					return Super;
				}();
				exports$8.SwitchCase = function() {
					function SwitchCase(test, consequent) {
						this.type = syntax_1.Syntax.SwitchCase;
						this.test = test;
						this.consequent = consequent;
					}
					return SwitchCase;
				}();
				exports$8.SwitchStatement = function() {
					function SwitchStatement(discriminant, cases) {
						this.type = syntax_1.Syntax.SwitchStatement;
						this.discriminant = discriminant;
						this.cases = cases;
					}
					return SwitchStatement;
				}();
				exports$8.TaggedTemplateExpression = function() {
					function TaggedTemplateExpression(tag, quasi) {
						this.type = syntax_1.Syntax.TaggedTemplateExpression;
						this.tag = tag;
						this.quasi = quasi;
					}
					return TaggedTemplateExpression;
				}();
				exports$8.TemplateElement = function() {
					function TemplateElement(value, tail) {
						this.type = syntax_1.Syntax.TemplateElement;
						this.value = value;
						this.tail = tail;
					}
					return TemplateElement;
				}();
				exports$8.TemplateLiteral = function() {
					function TemplateLiteral(quasis, expressions) {
						this.type = syntax_1.Syntax.TemplateLiteral;
						this.quasis = quasis;
						this.expressions = expressions;
					}
					return TemplateLiteral;
				}();
				exports$8.ThisExpression = function() {
					function ThisExpression() {
						this.type = syntax_1.Syntax.ThisExpression;
					}
					return ThisExpression;
				}();
				exports$8.ThrowStatement = function() {
					function ThrowStatement(argument) {
						this.type = syntax_1.Syntax.ThrowStatement;
						this.argument = argument;
					}
					return ThrowStatement;
				}();
				exports$8.TryStatement = function() {
					function TryStatement(block, handler, finalizer) {
						this.type = syntax_1.Syntax.TryStatement;
						this.block = block;
						this.handler = handler;
						this.finalizer = finalizer;
					}
					return TryStatement;
				}();
				exports$8.UnaryExpression = function() {
					function UnaryExpression(operator, argument) {
						this.type = syntax_1.Syntax.UnaryExpression;
						this.operator = operator;
						this.argument = argument;
						this.prefix = true;
					}
					return UnaryExpression;
				}();
				exports$8.UpdateExpression = function() {
					function UpdateExpression(operator, argument, prefix) {
						this.type = syntax_1.Syntax.UpdateExpression;
						this.operator = operator;
						this.argument = argument;
						this.prefix = prefix;
					}
					return UpdateExpression;
				}();
				exports$8.VariableDeclaration = function() {
					function VariableDeclaration(declarations, kind) {
						this.type = syntax_1.Syntax.VariableDeclaration;
						this.declarations = declarations;
						this.kind = kind;
					}
					return VariableDeclaration;
				}();
				exports$8.VariableDeclarator = function() {
					function VariableDeclarator(id, init) {
						this.type = syntax_1.Syntax.VariableDeclarator;
						this.id = id;
						this.init = init;
					}
					return VariableDeclarator;
				}();
				exports$8.WhileStatement = function() {
					function WhileStatement(test, body) {
						this.type = syntax_1.Syntax.WhileStatement;
						this.test = test;
						this.body = body;
					}
					return WhileStatement;
				}();
				exports$8.WithStatement = function() {
					function WithStatement(object, body) {
						this.type = syntax_1.Syntax.WithStatement;
						this.object = object;
						this.body = body;
					}
					return WithStatement;
				}();
				exports$8.YieldExpression = function() {
					function YieldExpression(argument, delegate) {
						this.type = syntax_1.Syntax.YieldExpression;
						this.argument = argument;
						this.delegate = delegate;
					}
					return YieldExpression;
				}();
			},
			function(module$10, exports$9, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$9, "__esModule", { value: true });
				var assert_1 = __webpack_require__(9);
				var error_handler_1 = __webpack_require__(10);
				var messages_1 = __webpack_require__(11);
				var Node = __webpack_require__(7);
				var scanner_1 = __webpack_require__(12);
				var syntax_1 = __webpack_require__(2);
				var token_1 = __webpack_require__(13);
				var ArrowParameterPlaceHolder = "ArrowParameterPlaceHolder";
				exports$9.Parser = function() {
					function Parser(code, options, delegate) {
						if (options === void 0) options = {};
						this.config = {
							range: typeof options.range === "boolean" && options.range,
							loc: typeof options.loc === "boolean" && options.loc,
							source: null,
							tokens: typeof options.tokens === "boolean" && options.tokens,
							comment: typeof options.comment === "boolean" && options.comment,
							tolerant: typeof options.tolerant === "boolean" && options.tolerant
						};
						if (this.config.loc && options.source && options.source !== null) this.config.source = String(options.source);
						this.delegate = delegate;
						this.errorHandler = new error_handler_1.ErrorHandler();
						this.errorHandler.tolerant = this.config.tolerant;
						this.scanner = new scanner_1.Scanner(code, this.errorHandler);
						this.scanner.trackComment = this.config.comment;
						this.operatorPrecedence = {
							")": 0,
							";": 0,
							",": 0,
							"=": 0,
							"]": 0,
							"||": 1,
							"&&": 2,
							"|": 3,
							"^": 4,
							"&": 5,
							"==": 6,
							"!=": 6,
							"===": 6,
							"!==": 6,
							"<": 7,
							">": 7,
							"<=": 7,
							">=": 7,
							"<<": 8,
							">>": 8,
							">>>": 8,
							"+": 9,
							"-": 9,
							"*": 11,
							"/": 11,
							"%": 11
						};
						this.lookahead = {
							type: 2,
							value: "",
							lineNumber: this.scanner.lineNumber,
							lineStart: 0,
							start: 0,
							end: 0
						};
						this.hasLineTerminator = false;
						this.context = {
							isModule: false,
							await: false,
							allowIn: true,
							allowStrictDirective: true,
							allowYield: true,
							firstCoverInitializedNameError: null,
							isAssignmentTarget: false,
							isBindingElement: false,
							inFunctionBody: false,
							inIteration: false,
							inSwitch: false,
							labelSet: {},
							strict: false
						};
						this.tokens = [];
						this.startMarker = {
							index: 0,
							line: this.scanner.lineNumber,
							column: 0
						};
						this.lastMarker = {
							index: 0,
							line: this.scanner.lineNumber,
							column: 0
						};
						this.nextToken();
						this.lastMarker = {
							index: this.scanner.index,
							line: this.scanner.lineNumber,
							column: this.scanner.index - this.scanner.lineStart
						};
					}
					Parser.prototype.throwError = function(messageFormat) {
						var values = [];
						for (var _i = 1; _i < arguments.length; _i++) values[_i - 1] = arguments[_i];
						var args = Array.prototype.slice.call(arguments, 1);
						var msg = messageFormat.replace(/%(\d)/g, function(whole, idx) {
							assert_1.assert(idx < args.length, "Message reference must be in range");
							return args[idx];
						});
						var index = this.lastMarker.index;
						var line = this.lastMarker.line;
						var column = this.lastMarker.column + 1;
						throw this.errorHandler.createError(index, line, column, msg);
					};
					Parser.prototype.tolerateError = function(messageFormat) {
						var values = [];
						for (var _i = 1; _i < arguments.length; _i++) values[_i - 1] = arguments[_i];
						var args = Array.prototype.slice.call(arguments, 1);
						var msg = messageFormat.replace(/%(\d)/g, function(whole, idx) {
							assert_1.assert(idx < args.length, "Message reference must be in range");
							return args[idx];
						});
						var index = this.lastMarker.index;
						var line = this.scanner.lineNumber;
						var column = this.lastMarker.column + 1;
						this.errorHandler.tolerateError(index, line, column, msg);
					};
					Parser.prototype.unexpectedTokenError = function(token, message) {
						var msg = message || messages_1.Messages.UnexpectedToken;
						var value;
						if (token) {
							if (!message) {
								msg = token.type === 2 ? messages_1.Messages.UnexpectedEOS : token.type === 3 ? messages_1.Messages.UnexpectedIdentifier : token.type === 6 ? messages_1.Messages.UnexpectedNumber : token.type === 8 ? messages_1.Messages.UnexpectedString : token.type === 10 ? messages_1.Messages.UnexpectedTemplate : messages_1.Messages.UnexpectedToken;
								if (token.type === 4) {
									if (this.scanner.isFutureReservedWord(token.value)) msg = messages_1.Messages.UnexpectedReserved;
									else if (this.context.strict && this.scanner.isStrictModeReservedWord(token.value)) msg = messages_1.Messages.StrictReservedWord;
								}
							}
							value = token.value;
						} else value = "ILLEGAL";
						msg = msg.replace("%0", value);
						if (token && typeof token.lineNumber === "number") {
							var index = token.start;
							var line = token.lineNumber;
							var lastMarkerLineStart = this.lastMarker.index - this.lastMarker.column;
							var column = token.start - lastMarkerLineStart + 1;
							return this.errorHandler.createError(index, line, column, msg);
						} else {
							var index = this.lastMarker.index;
							var line = this.lastMarker.line;
							var column = this.lastMarker.column + 1;
							return this.errorHandler.createError(index, line, column, msg);
						}
					};
					Parser.prototype.throwUnexpectedToken = function(token, message) {
						throw this.unexpectedTokenError(token, message);
					};
					Parser.prototype.tolerateUnexpectedToken = function(token, message) {
						this.errorHandler.tolerate(this.unexpectedTokenError(token, message));
					};
					Parser.prototype.collectComments = function() {
						if (!this.config.comment) this.scanner.scanComments();
						else {
							var comments = this.scanner.scanComments();
							if (comments.length > 0 && this.delegate) for (var i = 0; i < comments.length; ++i) {
								var e = comments[i];
								var node = void 0;
								node = {
									type: e.multiLine ? "BlockComment" : "LineComment",
									value: this.scanner.source.slice(e.slice[0], e.slice[1])
								};
								if (this.config.range) node.range = e.range;
								if (this.config.loc) node.loc = e.loc;
								var metadata = {
									start: {
										line: e.loc.start.line,
										column: e.loc.start.column,
										offset: e.range[0]
									},
									end: {
										line: e.loc.end.line,
										column: e.loc.end.column,
										offset: e.range[1]
									}
								};
								this.delegate(node, metadata);
							}
						}
					};
					Parser.prototype.getTokenRaw = function(token) {
						return this.scanner.source.slice(token.start, token.end);
					};
					Parser.prototype.convertToken = function(token) {
						var t = {
							type: token_1.TokenName[token.type],
							value: this.getTokenRaw(token)
						};
						if (this.config.range) t.range = [token.start, token.end];
						if (this.config.loc) t.loc = {
							start: {
								line: this.startMarker.line,
								column: this.startMarker.column
							},
							end: {
								line: this.scanner.lineNumber,
								column: this.scanner.index - this.scanner.lineStart
							}
						};
						if (token.type === 9) t.regex = {
							pattern: token.pattern,
							flags: token.flags
						};
						return t;
					};
					Parser.prototype.nextToken = function() {
						var token = this.lookahead;
						this.lastMarker.index = this.scanner.index;
						this.lastMarker.line = this.scanner.lineNumber;
						this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
						this.collectComments();
						if (this.scanner.index !== this.startMarker.index) {
							this.startMarker.index = this.scanner.index;
							this.startMarker.line = this.scanner.lineNumber;
							this.startMarker.column = this.scanner.index - this.scanner.lineStart;
						}
						var next = this.scanner.lex();
						this.hasLineTerminator = token.lineNumber !== next.lineNumber;
						if (next && this.context.strict && next.type === 3) {
							if (this.scanner.isStrictModeReservedWord(next.value)) next.type = 4;
						}
						this.lookahead = next;
						if (this.config.tokens && next.type !== 2) this.tokens.push(this.convertToken(next));
						return token;
					};
					Parser.prototype.nextRegexToken = function() {
						this.collectComments();
						var token = this.scanner.scanRegExp();
						if (this.config.tokens) {
							this.tokens.pop();
							this.tokens.push(this.convertToken(token));
						}
						this.lookahead = token;
						this.nextToken();
						return token;
					};
					Parser.prototype.createNode = function() {
						return {
							index: this.startMarker.index,
							line: this.startMarker.line,
							column: this.startMarker.column
						};
					};
					Parser.prototype.startNode = function(token, lastLineStart) {
						if (lastLineStart === void 0) lastLineStart = 0;
						var column = token.start - token.lineStart;
						var line = token.lineNumber;
						if (column < 0) {
							column += lastLineStart;
							line--;
						}
						return {
							index: token.start,
							line,
							column
						};
					};
					Parser.prototype.finalize = function(marker, node) {
						if (this.config.range) node.range = [marker.index, this.lastMarker.index];
						if (this.config.loc) {
							node.loc = {
								start: {
									line: marker.line,
									column: marker.column
								},
								end: {
									line: this.lastMarker.line,
									column: this.lastMarker.column
								}
							};
							if (this.config.source) node.loc.source = this.config.source;
						}
						if (this.delegate) {
							var metadata = {
								start: {
									line: marker.line,
									column: marker.column,
									offset: marker.index
								},
								end: {
									line: this.lastMarker.line,
									column: this.lastMarker.column,
									offset: this.lastMarker.index
								}
							};
							this.delegate(node, metadata);
						}
						return node;
					};
					Parser.prototype.expect = function(value) {
						var token = this.nextToken();
						if (token.type !== 7 || token.value !== value) this.throwUnexpectedToken(token);
					};
					Parser.prototype.expectCommaSeparator = function() {
						if (this.config.tolerant) {
							var token = this.lookahead;
							if (token.type === 7 && token.value === ",") this.nextToken();
							else if (token.type === 7 && token.value === ";") {
								this.nextToken();
								this.tolerateUnexpectedToken(token);
							} else this.tolerateUnexpectedToken(token, messages_1.Messages.UnexpectedToken);
						} else this.expect(",");
					};
					Parser.prototype.expectKeyword = function(keyword) {
						var token = this.nextToken();
						if (token.type !== 4 || token.value !== keyword) this.throwUnexpectedToken(token);
					};
					Parser.prototype.match = function(value) {
						return this.lookahead.type === 7 && this.lookahead.value === value;
					};
					Parser.prototype.matchKeyword = function(keyword) {
						return this.lookahead.type === 4 && this.lookahead.value === keyword;
					};
					Parser.prototype.matchContextualKeyword = function(keyword) {
						return this.lookahead.type === 3 && this.lookahead.value === keyword;
					};
					Parser.prototype.matchAssign = function() {
						if (this.lookahead.type !== 7) return false;
						var op = this.lookahead.value;
						return op === "=" || op === "*=" || op === "**=" || op === "/=" || op === "%=" || op === "+=" || op === "-=" || op === "<<=" || op === ">>=" || op === ">>>=" || op === "&=" || op === "^=" || op === "|=";
					};
					Parser.prototype.isolateCoverGrammar = function(parseFunction) {
						var previousIsBindingElement = this.context.isBindingElement;
						var previousIsAssignmentTarget = this.context.isAssignmentTarget;
						var previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
						this.context.isBindingElement = true;
						this.context.isAssignmentTarget = true;
						this.context.firstCoverInitializedNameError = null;
						var result = parseFunction.call(this);
						if (this.context.firstCoverInitializedNameError !== null) this.throwUnexpectedToken(this.context.firstCoverInitializedNameError);
						this.context.isBindingElement = previousIsBindingElement;
						this.context.isAssignmentTarget = previousIsAssignmentTarget;
						this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError;
						return result;
					};
					Parser.prototype.inheritCoverGrammar = function(parseFunction) {
						var previousIsBindingElement = this.context.isBindingElement;
						var previousIsAssignmentTarget = this.context.isAssignmentTarget;
						var previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
						this.context.isBindingElement = true;
						this.context.isAssignmentTarget = true;
						this.context.firstCoverInitializedNameError = null;
						var result = parseFunction.call(this);
						this.context.isBindingElement = this.context.isBindingElement && previousIsBindingElement;
						this.context.isAssignmentTarget = this.context.isAssignmentTarget && previousIsAssignmentTarget;
						this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError || this.context.firstCoverInitializedNameError;
						return result;
					};
					Parser.prototype.consumeSemicolon = function() {
						if (this.match(";")) this.nextToken();
						else if (!this.hasLineTerminator) {
							if (this.lookahead.type !== 2 && !this.match("}")) this.throwUnexpectedToken(this.lookahead);
							this.lastMarker.index = this.startMarker.index;
							this.lastMarker.line = this.startMarker.line;
							this.lastMarker.column = this.startMarker.column;
						}
					};
					Parser.prototype.parsePrimaryExpression = function() {
						var node = this.createNode();
						var expr;
						var token, raw;
						switch (this.lookahead.type) {
							case 3:
								if ((this.context.isModule || this.context.await) && this.lookahead.value === "await") this.tolerateUnexpectedToken(this.lookahead);
								expr = this.matchAsyncFunction() ? this.parseFunctionExpression() : this.finalize(node, new Node.Identifier(this.nextToken().value));
								break;
							case 6:
							case 8:
								if (this.context.strict && this.lookahead.octal) this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.StrictOctalLiteral);
								this.context.isAssignmentTarget = false;
								this.context.isBindingElement = false;
								token = this.nextToken();
								raw = this.getTokenRaw(token);
								expr = this.finalize(node, new Node.Literal(token.value, raw));
								break;
							case 1:
								this.context.isAssignmentTarget = false;
								this.context.isBindingElement = false;
								token = this.nextToken();
								raw = this.getTokenRaw(token);
								expr = this.finalize(node, new Node.Literal(token.value === "true", raw));
								break;
							case 5:
								this.context.isAssignmentTarget = false;
								this.context.isBindingElement = false;
								token = this.nextToken();
								raw = this.getTokenRaw(token);
								expr = this.finalize(node, new Node.Literal(null, raw));
								break;
							case 10:
								expr = this.parseTemplateLiteral();
								break;
							case 7:
								switch (this.lookahead.value) {
									case "(":
										this.context.isBindingElement = false;
										expr = this.inheritCoverGrammar(this.parseGroupExpression);
										break;
									case "[":
										expr = this.inheritCoverGrammar(this.parseArrayInitializer);
										break;
									case "{":
										expr = this.inheritCoverGrammar(this.parseObjectInitializer);
										break;
									case "/":
									case "/=":
										this.context.isAssignmentTarget = false;
										this.context.isBindingElement = false;
										this.scanner.index = this.startMarker.index;
										token = this.nextRegexToken();
										raw = this.getTokenRaw(token);
										expr = this.finalize(node, new Node.RegexLiteral(token.regex, raw, token.pattern, token.flags));
										break;
									default: expr = this.throwUnexpectedToken(this.nextToken());
								}
								break;
							case 4:
								if (!this.context.strict && this.context.allowYield && this.matchKeyword("yield")) expr = this.parseIdentifierName();
								else if (!this.context.strict && this.matchKeyword("let")) expr = this.finalize(node, new Node.Identifier(this.nextToken().value));
								else {
									this.context.isAssignmentTarget = false;
									this.context.isBindingElement = false;
									if (this.matchKeyword("function")) expr = this.parseFunctionExpression();
									else if (this.matchKeyword("this")) {
										this.nextToken();
										expr = this.finalize(node, new Node.ThisExpression());
									} else if (this.matchKeyword("class")) expr = this.parseClassExpression();
									else expr = this.throwUnexpectedToken(this.nextToken());
								}
								break;
							default: expr = this.throwUnexpectedToken(this.nextToken());
						}
						return expr;
					};
					Parser.prototype.parseSpreadElement = function() {
						var node = this.createNode();
						this.expect("...");
						var arg = this.inheritCoverGrammar(this.parseAssignmentExpression);
						return this.finalize(node, new Node.SpreadElement(arg));
					};
					Parser.prototype.parseArrayInitializer = function() {
						var node = this.createNode();
						var elements = [];
						this.expect("[");
						while (!this.match("]")) if (this.match(",")) {
							this.nextToken();
							elements.push(null);
						} else if (this.match("...")) {
							var element = this.parseSpreadElement();
							if (!this.match("]")) {
								this.context.isAssignmentTarget = false;
								this.context.isBindingElement = false;
								this.expect(",");
							}
							elements.push(element);
						} else {
							elements.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
							if (!this.match("]")) this.expect(",");
						}
						this.expect("]");
						return this.finalize(node, new Node.ArrayExpression(elements));
					};
					Parser.prototype.parsePropertyMethod = function(params) {
						this.context.isAssignmentTarget = false;
						this.context.isBindingElement = false;
						var previousStrict = this.context.strict;
						var previousAllowStrictDirective = this.context.allowStrictDirective;
						this.context.allowStrictDirective = params.simple;
						var body = this.isolateCoverGrammar(this.parseFunctionSourceElements);
						if (this.context.strict && params.firstRestricted) this.tolerateUnexpectedToken(params.firstRestricted, params.message);
						if (this.context.strict && params.stricted) this.tolerateUnexpectedToken(params.stricted, params.message);
						this.context.strict = previousStrict;
						this.context.allowStrictDirective = previousAllowStrictDirective;
						return body;
					};
					Parser.prototype.parsePropertyMethodFunction = function() {
						var isGenerator = false;
						var node = this.createNode();
						var previousAllowYield = this.context.allowYield;
						this.context.allowYield = true;
						var params = this.parseFormalParameters();
						var method = this.parsePropertyMethod(params);
						this.context.allowYield = previousAllowYield;
						return this.finalize(node, new Node.FunctionExpression(null, params.params, method, isGenerator));
					};
					Parser.prototype.parsePropertyMethodAsyncFunction = function() {
						var node = this.createNode();
						var previousAllowYield = this.context.allowYield;
						var previousAwait = this.context.await;
						this.context.allowYield = false;
						this.context.await = true;
						var params = this.parseFormalParameters();
						var method = this.parsePropertyMethod(params);
						this.context.allowYield = previousAllowYield;
						this.context.await = previousAwait;
						return this.finalize(node, new Node.AsyncFunctionExpression(null, params.params, method));
					};
					Parser.prototype.parseObjectPropertyKey = function() {
						var node = this.createNode();
						var token = this.nextToken();
						var key;
						switch (token.type) {
							case 8:
							case 6:
								if (this.context.strict && token.octal) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictOctalLiteral);
								var raw = this.getTokenRaw(token);
								key = this.finalize(node, new Node.Literal(token.value, raw));
								break;
							case 3:
							case 1:
							case 5:
							case 4:
								key = this.finalize(node, new Node.Identifier(token.value));
								break;
							case 7:
								if (token.value === "[") {
									key = this.isolateCoverGrammar(this.parseAssignmentExpression);
									this.expect("]");
								} else key = this.throwUnexpectedToken(token);
								break;
							default: key = this.throwUnexpectedToken(token);
						}
						return key;
					};
					Parser.prototype.isPropertyKey = function(key, value) {
						return key.type === syntax_1.Syntax.Identifier && key.name === value || key.type === syntax_1.Syntax.Literal && key.value === value;
					};
					Parser.prototype.parseObjectProperty = function(hasProto) {
						var node = this.createNode();
						var token = this.lookahead;
						var kind;
						var key = null;
						var value = null;
						var computed = false;
						var method = false;
						var shorthand = false;
						var isAsync = false;
						if (token.type === 3) {
							var id = token.value;
							this.nextToken();
							computed = this.match("[");
							isAsync = !this.hasLineTerminator && id === "async" && !this.match(":") && !this.match("(") && !this.match("*") && !this.match(",");
							key = isAsync ? this.parseObjectPropertyKey() : this.finalize(node, new Node.Identifier(id));
						} else if (this.match("*")) this.nextToken();
						else {
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
						}
						var lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
						if (token.type === 3 && !isAsync && token.value === "get" && lookaheadPropertyKey) {
							kind = "get";
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							this.context.allowYield = false;
							value = this.parseGetterMethod();
						} else if (token.type === 3 && !isAsync && token.value === "set" && lookaheadPropertyKey) {
							kind = "set";
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							value = this.parseSetterMethod();
						} else if (token.type === 7 && token.value === "*" && lookaheadPropertyKey) {
							kind = "init";
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							value = this.parseGeneratorMethod();
							method = true;
						} else {
							if (!key) this.throwUnexpectedToken(this.lookahead);
							kind = "init";
							if (this.match(":") && !isAsync) {
								if (!computed && this.isPropertyKey(key, "__proto__")) {
									if (hasProto.value) this.tolerateError(messages_1.Messages.DuplicateProtoProperty);
									hasProto.value = true;
								}
								this.nextToken();
								value = this.inheritCoverGrammar(this.parseAssignmentExpression);
							} else if (this.match("(")) {
								value = isAsync ? this.parsePropertyMethodAsyncFunction() : this.parsePropertyMethodFunction();
								method = true;
							} else if (token.type === 3) {
								var id = this.finalize(node, new Node.Identifier(token.value));
								if (this.match("=")) {
									this.context.firstCoverInitializedNameError = this.lookahead;
									this.nextToken();
									shorthand = true;
									var init = this.isolateCoverGrammar(this.parseAssignmentExpression);
									value = this.finalize(node, new Node.AssignmentPattern(id, init));
								} else {
									shorthand = true;
									value = id;
								}
							} else this.throwUnexpectedToken(this.nextToken());
						}
						return this.finalize(node, new Node.Property(kind, key, computed, value, method, shorthand));
					};
					Parser.prototype.parseObjectInitializer = function() {
						var node = this.createNode();
						this.expect("{");
						var properties = [];
						var hasProto = { value: false };
						while (!this.match("}")) {
							properties.push(this.parseObjectProperty(hasProto));
							if (!this.match("}")) this.expectCommaSeparator();
						}
						this.expect("}");
						return this.finalize(node, new Node.ObjectExpression(properties));
					};
					Parser.prototype.parseTemplateHead = function() {
						assert_1.assert(this.lookahead.head, "Template literal must start with a template head");
						var node = this.createNode();
						var token = this.nextToken();
						var raw = token.value;
						var cooked = token.cooked;
						return this.finalize(node, new Node.TemplateElement({
							raw,
							cooked
						}, token.tail));
					};
					Parser.prototype.parseTemplateElement = function() {
						if (this.lookahead.type !== 10) this.throwUnexpectedToken();
						var node = this.createNode();
						var token = this.nextToken();
						var raw = token.value;
						var cooked = token.cooked;
						return this.finalize(node, new Node.TemplateElement({
							raw,
							cooked
						}, token.tail));
					};
					Parser.prototype.parseTemplateLiteral = function() {
						var node = this.createNode();
						var expressions = [];
						var quasis = [];
						var quasi = this.parseTemplateHead();
						quasis.push(quasi);
						while (!quasi.tail) {
							expressions.push(this.parseExpression());
							quasi = this.parseTemplateElement();
							quasis.push(quasi);
						}
						return this.finalize(node, new Node.TemplateLiteral(quasis, expressions));
					};
					Parser.prototype.reinterpretExpressionAsPattern = function(expr) {
						switch (expr.type) {
							case syntax_1.Syntax.Identifier:
							case syntax_1.Syntax.MemberExpression:
							case syntax_1.Syntax.RestElement:
							case syntax_1.Syntax.AssignmentPattern: break;
							case syntax_1.Syntax.SpreadElement:
								expr.type = syntax_1.Syntax.RestElement;
								this.reinterpretExpressionAsPattern(expr.argument);
								break;
							case syntax_1.Syntax.ArrayExpression:
								expr.type = syntax_1.Syntax.ArrayPattern;
								for (var i = 0; i < expr.elements.length; i++) if (expr.elements[i] !== null) this.reinterpretExpressionAsPattern(expr.elements[i]);
								break;
							case syntax_1.Syntax.ObjectExpression:
								expr.type = syntax_1.Syntax.ObjectPattern;
								for (var i = 0; i < expr.properties.length; i++) this.reinterpretExpressionAsPattern(expr.properties[i].value);
								break;
							case syntax_1.Syntax.AssignmentExpression:
								expr.type = syntax_1.Syntax.AssignmentPattern;
								delete expr.operator;
								this.reinterpretExpressionAsPattern(expr.left);
								break;
							default: break;
						}
					};
					Parser.prototype.parseGroupExpression = function() {
						var expr;
						this.expect("(");
						if (this.match(")")) {
							this.nextToken();
							if (!this.match("=>")) this.expect("=>");
							expr = {
								type: ArrowParameterPlaceHolder,
								params: [],
								async: false
							};
						} else {
							var startToken = this.lookahead;
							var params = [];
							if (this.match("...")) {
								expr = this.parseRestElement(params);
								this.expect(")");
								if (!this.match("=>")) this.expect("=>");
								expr = {
									type: ArrowParameterPlaceHolder,
									params: [expr],
									async: false
								};
							} else {
								var arrow = false;
								this.context.isBindingElement = true;
								expr = this.inheritCoverGrammar(this.parseAssignmentExpression);
								if (this.match(",")) {
									var expressions = [];
									this.context.isAssignmentTarget = false;
									expressions.push(expr);
									while (this.lookahead.type !== 2) {
										if (!this.match(",")) break;
										this.nextToken();
										if (this.match(")")) {
											this.nextToken();
											for (var i = 0; i < expressions.length; i++) this.reinterpretExpressionAsPattern(expressions[i]);
											arrow = true;
											expr = {
												type: ArrowParameterPlaceHolder,
												params: expressions,
												async: false
											};
										} else if (this.match("...")) {
											if (!this.context.isBindingElement) this.throwUnexpectedToken(this.lookahead);
											expressions.push(this.parseRestElement(params));
											this.expect(")");
											if (!this.match("=>")) this.expect("=>");
											this.context.isBindingElement = false;
											for (var i = 0; i < expressions.length; i++) this.reinterpretExpressionAsPattern(expressions[i]);
											arrow = true;
											expr = {
												type: ArrowParameterPlaceHolder,
												params: expressions,
												async: false
											};
										} else expressions.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
										if (arrow) break;
									}
									if (!arrow) expr = this.finalize(this.startNode(startToken), new Node.SequenceExpression(expressions));
								}
								if (!arrow) {
									this.expect(")");
									if (this.match("=>")) {
										if (expr.type === syntax_1.Syntax.Identifier && expr.name === "yield") {
											arrow = true;
											expr = {
												type: ArrowParameterPlaceHolder,
												params: [expr],
												async: false
											};
										}
										if (!arrow) {
											if (!this.context.isBindingElement) this.throwUnexpectedToken(this.lookahead);
											if (expr.type === syntax_1.Syntax.SequenceExpression) for (var i = 0; i < expr.expressions.length; i++) this.reinterpretExpressionAsPattern(expr.expressions[i]);
											else this.reinterpretExpressionAsPattern(expr);
											expr = {
												type: ArrowParameterPlaceHolder,
												params: expr.type === syntax_1.Syntax.SequenceExpression ? expr.expressions : [expr],
												async: false
											};
										}
									}
									this.context.isBindingElement = false;
								}
							}
						}
						return expr;
					};
					Parser.prototype.parseArguments = function() {
						this.expect("(");
						var args = [];
						if (!this.match(")")) while (true) {
							var expr = this.match("...") ? this.parseSpreadElement() : this.isolateCoverGrammar(this.parseAssignmentExpression);
							args.push(expr);
							if (this.match(")")) break;
							this.expectCommaSeparator();
							if (this.match(")")) break;
						}
						this.expect(")");
						return args;
					};
					Parser.prototype.isIdentifierName = function(token) {
						return token.type === 3 || token.type === 4 || token.type === 1 || token.type === 5;
					};
					Parser.prototype.parseIdentifierName = function() {
						var node = this.createNode();
						var token = this.nextToken();
						if (!this.isIdentifierName(token)) this.throwUnexpectedToken(token);
						return this.finalize(node, new Node.Identifier(token.value));
					};
					Parser.prototype.parseNewExpression = function() {
						var node = this.createNode();
						var id = this.parseIdentifierName();
						assert_1.assert(id.name === "new", "New expression must start with `new`");
						var expr;
						if (this.match(".")) {
							this.nextToken();
							if (this.lookahead.type === 3 && this.context.inFunctionBody && this.lookahead.value === "target") {
								var property = this.parseIdentifierName();
								expr = new Node.MetaProperty(id, property);
							} else this.throwUnexpectedToken(this.lookahead);
						} else {
							var callee = this.isolateCoverGrammar(this.parseLeftHandSideExpression);
							var args = this.match("(") ? this.parseArguments() : [];
							expr = new Node.NewExpression(callee, args);
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
						}
						return this.finalize(node, expr);
					};
					Parser.prototype.parseAsyncArgument = function() {
						var arg = this.parseAssignmentExpression();
						this.context.firstCoverInitializedNameError = null;
						return arg;
					};
					Parser.prototype.parseAsyncArguments = function() {
						this.expect("(");
						var args = [];
						if (!this.match(")")) while (true) {
							var expr = this.match("...") ? this.parseSpreadElement() : this.isolateCoverGrammar(this.parseAsyncArgument);
							args.push(expr);
							if (this.match(")")) break;
							this.expectCommaSeparator();
							if (this.match(")")) break;
						}
						this.expect(")");
						return args;
					};
					Parser.prototype.parseLeftHandSideExpressionAllowCall = function() {
						var startToken = this.lookahead;
						var maybeAsync = this.matchContextualKeyword("async");
						var previousAllowIn = this.context.allowIn;
						this.context.allowIn = true;
						var expr;
						if (this.matchKeyword("super") && this.context.inFunctionBody) {
							expr = this.createNode();
							this.nextToken();
							expr = this.finalize(expr, new Node.Super());
							if (!this.match("(") && !this.match(".") && !this.match("[")) this.throwUnexpectedToken(this.lookahead);
						} else expr = this.inheritCoverGrammar(this.matchKeyword("new") ? this.parseNewExpression : this.parsePrimaryExpression);
						while (true) if (this.match(".")) {
							this.context.isBindingElement = false;
							this.context.isAssignmentTarget = true;
							this.expect(".");
							var property = this.parseIdentifierName();
							expr = this.finalize(this.startNode(startToken), new Node.StaticMemberExpression(expr, property));
						} else if (this.match("(")) {
							var asyncArrow = maybeAsync && startToken.lineNumber === this.lookahead.lineNumber;
							this.context.isBindingElement = false;
							this.context.isAssignmentTarget = false;
							var args = asyncArrow ? this.parseAsyncArguments() : this.parseArguments();
							expr = this.finalize(this.startNode(startToken), new Node.CallExpression(expr, args));
							if (asyncArrow && this.match("=>")) {
								for (var i = 0; i < args.length; ++i) this.reinterpretExpressionAsPattern(args[i]);
								expr = {
									type: ArrowParameterPlaceHolder,
									params: args,
									async: true
								};
							}
						} else if (this.match("[")) {
							this.context.isBindingElement = false;
							this.context.isAssignmentTarget = true;
							this.expect("[");
							var property = this.isolateCoverGrammar(this.parseExpression);
							this.expect("]");
							expr = this.finalize(this.startNode(startToken), new Node.ComputedMemberExpression(expr, property));
						} else if (this.lookahead.type === 10 && this.lookahead.head) {
							var quasi = this.parseTemplateLiteral();
							expr = this.finalize(this.startNode(startToken), new Node.TaggedTemplateExpression(expr, quasi));
						} else break;
						this.context.allowIn = previousAllowIn;
						return expr;
					};
					Parser.prototype.parseSuper = function() {
						var node = this.createNode();
						this.expectKeyword("super");
						if (!this.match("[") && !this.match(".")) this.throwUnexpectedToken(this.lookahead);
						return this.finalize(node, new Node.Super());
					};
					Parser.prototype.parseLeftHandSideExpression = function() {
						assert_1.assert(this.context.allowIn, "callee of new expression always allow in keyword.");
						var node = this.startNode(this.lookahead);
						var expr = this.matchKeyword("super") && this.context.inFunctionBody ? this.parseSuper() : this.inheritCoverGrammar(this.matchKeyword("new") ? this.parseNewExpression : this.parsePrimaryExpression);
						while (true) if (this.match("[")) {
							this.context.isBindingElement = false;
							this.context.isAssignmentTarget = true;
							this.expect("[");
							var property = this.isolateCoverGrammar(this.parseExpression);
							this.expect("]");
							expr = this.finalize(node, new Node.ComputedMemberExpression(expr, property));
						} else if (this.match(".")) {
							this.context.isBindingElement = false;
							this.context.isAssignmentTarget = true;
							this.expect(".");
							var property = this.parseIdentifierName();
							expr = this.finalize(node, new Node.StaticMemberExpression(expr, property));
						} else if (this.lookahead.type === 10 && this.lookahead.head) {
							var quasi = this.parseTemplateLiteral();
							expr = this.finalize(node, new Node.TaggedTemplateExpression(expr, quasi));
						} else break;
						return expr;
					};
					Parser.prototype.parseUpdateExpression = function() {
						var expr;
						var startToken = this.lookahead;
						if (this.match("++") || this.match("--")) {
							var node = this.startNode(startToken);
							var token = this.nextToken();
							expr = this.inheritCoverGrammar(this.parseUnaryExpression);
							if (this.context.strict && expr.type === syntax_1.Syntax.Identifier && this.scanner.isRestrictedWord(expr.name)) this.tolerateError(messages_1.Messages.StrictLHSPrefix);
							if (!this.context.isAssignmentTarget) this.tolerateError(messages_1.Messages.InvalidLHSInAssignment);
							var prefix = true;
							expr = this.finalize(node, new Node.UpdateExpression(token.value, expr, prefix));
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
						} else {
							expr = this.inheritCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
							if (!this.hasLineTerminator && this.lookahead.type === 7) {
								if (this.match("++") || this.match("--")) {
									if (this.context.strict && expr.type === syntax_1.Syntax.Identifier && this.scanner.isRestrictedWord(expr.name)) this.tolerateError(messages_1.Messages.StrictLHSPostfix);
									if (!this.context.isAssignmentTarget) this.tolerateError(messages_1.Messages.InvalidLHSInAssignment);
									this.context.isAssignmentTarget = false;
									this.context.isBindingElement = false;
									var operator = this.nextToken().value;
									var prefix = false;
									expr = this.finalize(this.startNode(startToken), new Node.UpdateExpression(operator, expr, prefix));
								}
							}
						}
						return expr;
					};
					Parser.prototype.parseAwaitExpression = function() {
						var node = this.createNode();
						this.nextToken();
						var argument = this.parseUnaryExpression();
						return this.finalize(node, new Node.AwaitExpression(argument));
					};
					Parser.prototype.parseUnaryExpression = function() {
						var expr;
						if (this.match("+") || this.match("-") || this.match("~") || this.match("!") || this.matchKeyword("delete") || this.matchKeyword("void") || this.matchKeyword("typeof")) {
							var node = this.startNode(this.lookahead);
							var token = this.nextToken();
							expr = this.inheritCoverGrammar(this.parseUnaryExpression);
							expr = this.finalize(node, new Node.UnaryExpression(token.value, expr));
							if (this.context.strict && expr.operator === "delete" && expr.argument.type === syntax_1.Syntax.Identifier) this.tolerateError(messages_1.Messages.StrictDelete);
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
						} else if (this.context.await && this.matchContextualKeyword("await")) expr = this.parseAwaitExpression();
						else expr = this.parseUpdateExpression();
						return expr;
					};
					Parser.prototype.parseExponentiationExpression = function() {
						var startToken = this.lookahead;
						var expr = this.inheritCoverGrammar(this.parseUnaryExpression);
						if (expr.type !== syntax_1.Syntax.UnaryExpression && this.match("**")) {
							this.nextToken();
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
							var left = expr;
							var right = this.isolateCoverGrammar(this.parseExponentiationExpression);
							expr = this.finalize(this.startNode(startToken), new Node.BinaryExpression("**", left, right));
						}
						return expr;
					};
					Parser.prototype.binaryPrecedence = function(token) {
						var op = token.value;
						var precedence;
						if (token.type === 7) precedence = this.operatorPrecedence[op] || 0;
						else if (token.type === 4) precedence = op === "instanceof" || this.context.allowIn && op === "in" ? 7 : 0;
						else precedence = 0;
						return precedence;
					};
					Parser.prototype.parseBinaryExpression = function() {
						var startToken = this.lookahead;
						var expr = this.inheritCoverGrammar(this.parseExponentiationExpression);
						var token = this.lookahead;
						var prec = this.binaryPrecedence(token);
						if (prec > 0) {
							this.nextToken();
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
							var markers = [startToken, this.lookahead];
							var left = expr;
							var right = this.isolateCoverGrammar(this.parseExponentiationExpression);
							var stack = [
								left,
								token.value,
								right
							];
							var precedences = [prec];
							while (true) {
								prec = this.binaryPrecedence(this.lookahead);
								if (prec <= 0) break;
								while (stack.length > 2 && prec <= precedences[precedences.length - 1]) {
									right = stack.pop();
									var operator = stack.pop();
									precedences.pop();
									left = stack.pop();
									markers.pop();
									var node = this.startNode(markers[markers.length - 1]);
									stack.push(this.finalize(node, new Node.BinaryExpression(operator, left, right)));
								}
								stack.push(this.nextToken().value);
								precedences.push(prec);
								markers.push(this.lookahead);
								stack.push(this.isolateCoverGrammar(this.parseExponentiationExpression));
							}
							var i = stack.length - 1;
							expr = stack[i];
							var lastMarker = markers.pop();
							while (i > 1) {
								var marker = markers.pop();
								var lastLineStart = lastMarker && lastMarker.lineStart;
								var node = this.startNode(marker, lastLineStart);
								var operator = stack[i - 1];
								expr = this.finalize(node, new Node.BinaryExpression(operator, stack[i - 2], expr));
								i -= 2;
								lastMarker = marker;
							}
						}
						return expr;
					};
					Parser.prototype.parseConditionalExpression = function() {
						var startToken = this.lookahead;
						var expr = this.inheritCoverGrammar(this.parseBinaryExpression);
						if (this.match("?")) {
							this.nextToken();
							var previousAllowIn = this.context.allowIn;
							this.context.allowIn = true;
							var consequent = this.isolateCoverGrammar(this.parseAssignmentExpression);
							this.context.allowIn = previousAllowIn;
							this.expect(":");
							var alternate = this.isolateCoverGrammar(this.parseAssignmentExpression);
							expr = this.finalize(this.startNode(startToken), new Node.ConditionalExpression(expr, consequent, alternate));
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
						}
						return expr;
					};
					Parser.prototype.checkPatternParam = function(options, param) {
						switch (param.type) {
							case syntax_1.Syntax.Identifier:
								this.validateParam(options, param, param.name);
								break;
							case syntax_1.Syntax.RestElement:
								this.checkPatternParam(options, param.argument);
								break;
							case syntax_1.Syntax.AssignmentPattern:
								this.checkPatternParam(options, param.left);
								break;
							case syntax_1.Syntax.ArrayPattern:
								for (var i = 0; i < param.elements.length; i++) if (param.elements[i] !== null) this.checkPatternParam(options, param.elements[i]);
								break;
							case syntax_1.Syntax.ObjectPattern:
								for (var i = 0; i < param.properties.length; i++) this.checkPatternParam(options, param.properties[i].value);
								break;
							default: break;
						}
						options.simple = options.simple && param instanceof Node.Identifier;
					};
					Parser.prototype.reinterpretAsCoverFormalsList = function(expr) {
						var params = [expr];
						var options;
						var asyncArrow = false;
						switch (expr.type) {
							case syntax_1.Syntax.Identifier: break;
							case ArrowParameterPlaceHolder:
								params = expr.params;
								asyncArrow = expr.async;
								break;
							default: return null;
						}
						options = {
							simple: true,
							paramSet: {}
						};
						for (var i = 0; i < params.length; ++i) {
							var param = params[i];
							if (param.type === syntax_1.Syntax.AssignmentPattern) {
								if (param.right.type === syntax_1.Syntax.YieldExpression) {
									if (param.right.argument) this.throwUnexpectedToken(this.lookahead);
									param.right.type = syntax_1.Syntax.Identifier;
									param.right.name = "yield";
									delete param.right.argument;
									delete param.right.delegate;
								}
							} else if (asyncArrow && param.type === syntax_1.Syntax.Identifier && param.name === "await") this.throwUnexpectedToken(this.lookahead);
							this.checkPatternParam(options, param);
							params[i] = param;
						}
						if (this.context.strict || !this.context.allowYield) for (var i = 0; i < params.length; ++i) {
							var param = params[i];
							if (param.type === syntax_1.Syntax.YieldExpression) this.throwUnexpectedToken(this.lookahead);
						}
						if (options.message === messages_1.Messages.StrictParamDupe) {
							var token = this.context.strict ? options.stricted : options.firstRestricted;
							this.throwUnexpectedToken(token, options.message);
						}
						return {
							simple: options.simple,
							params,
							stricted: options.stricted,
							firstRestricted: options.firstRestricted,
							message: options.message
						};
					};
					Parser.prototype.parseAssignmentExpression = function() {
						var expr;
						if (!this.context.allowYield && this.matchKeyword("yield")) expr = this.parseYieldExpression();
						else {
							var startToken = this.lookahead;
							var token = startToken;
							expr = this.parseConditionalExpression();
							if (token.type === 3 && token.lineNumber === this.lookahead.lineNumber && token.value === "async") {
								if (this.lookahead.type === 3 || this.matchKeyword("yield")) {
									var arg = this.parsePrimaryExpression();
									this.reinterpretExpressionAsPattern(arg);
									expr = {
										type: ArrowParameterPlaceHolder,
										params: [arg],
										async: true
									};
								}
							}
							if (expr.type === ArrowParameterPlaceHolder || this.match("=>")) {
								this.context.isAssignmentTarget = false;
								this.context.isBindingElement = false;
								var isAsync = expr.async;
								var list = this.reinterpretAsCoverFormalsList(expr);
								if (list) {
									if (this.hasLineTerminator) this.tolerateUnexpectedToken(this.lookahead);
									this.context.firstCoverInitializedNameError = null;
									var previousStrict = this.context.strict;
									var previousAllowStrictDirective = this.context.allowStrictDirective;
									this.context.allowStrictDirective = list.simple;
									var previousAllowYield = this.context.allowYield;
									var previousAwait = this.context.await;
									this.context.allowYield = true;
									this.context.await = isAsync;
									var node = this.startNode(startToken);
									this.expect("=>");
									var body = void 0;
									if (this.match("{")) {
										var previousAllowIn = this.context.allowIn;
										this.context.allowIn = true;
										body = this.parseFunctionSourceElements();
										this.context.allowIn = previousAllowIn;
									} else body = this.isolateCoverGrammar(this.parseAssignmentExpression);
									var expression = body.type !== syntax_1.Syntax.BlockStatement;
									if (this.context.strict && list.firstRestricted) this.throwUnexpectedToken(list.firstRestricted, list.message);
									if (this.context.strict && list.stricted) this.tolerateUnexpectedToken(list.stricted, list.message);
									expr = isAsync ? this.finalize(node, new Node.AsyncArrowFunctionExpression(list.params, body, expression)) : this.finalize(node, new Node.ArrowFunctionExpression(list.params, body, expression));
									this.context.strict = previousStrict;
									this.context.allowStrictDirective = previousAllowStrictDirective;
									this.context.allowYield = previousAllowYield;
									this.context.await = previousAwait;
								}
							} else if (this.matchAssign()) {
								if (!this.context.isAssignmentTarget) this.tolerateError(messages_1.Messages.InvalidLHSInAssignment);
								if (this.context.strict && expr.type === syntax_1.Syntax.Identifier) {
									var id = expr;
									if (this.scanner.isRestrictedWord(id.name)) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictLHSAssignment);
									if (this.scanner.isStrictModeReservedWord(id.name)) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictReservedWord);
								}
								if (!this.match("=")) {
									this.context.isAssignmentTarget = false;
									this.context.isBindingElement = false;
								} else this.reinterpretExpressionAsPattern(expr);
								token = this.nextToken();
								var operator = token.value;
								var right = this.isolateCoverGrammar(this.parseAssignmentExpression);
								expr = this.finalize(this.startNode(startToken), new Node.AssignmentExpression(operator, expr, right));
								this.context.firstCoverInitializedNameError = null;
							}
						}
						return expr;
					};
					Parser.prototype.parseExpression = function() {
						var startToken = this.lookahead;
						var expr = this.isolateCoverGrammar(this.parseAssignmentExpression);
						if (this.match(",")) {
							var expressions = [];
							expressions.push(expr);
							while (this.lookahead.type !== 2) {
								if (!this.match(",")) break;
								this.nextToken();
								expressions.push(this.isolateCoverGrammar(this.parseAssignmentExpression));
							}
							expr = this.finalize(this.startNode(startToken), new Node.SequenceExpression(expressions));
						}
						return expr;
					};
					Parser.prototype.parseStatementListItem = function() {
						var statement;
						this.context.isAssignmentTarget = true;
						this.context.isBindingElement = true;
						if (this.lookahead.type === 4) switch (this.lookahead.value) {
							case "export":
								if (!this.context.isModule) this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.IllegalExportDeclaration);
								statement = this.parseExportDeclaration();
								break;
							case "import":
								if (!this.context.isModule) this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.IllegalImportDeclaration);
								statement = this.parseImportDeclaration();
								break;
							case "const":
								statement = this.parseLexicalDeclaration({ inFor: false });
								break;
							case "function":
								statement = this.parseFunctionDeclaration();
								break;
							case "class":
								statement = this.parseClassDeclaration();
								break;
							case "let":
								statement = this.isLexicalDeclaration() ? this.parseLexicalDeclaration({ inFor: false }) : this.parseStatement();
								break;
							default:
								statement = this.parseStatement();
								break;
						}
						else statement = this.parseStatement();
						return statement;
					};
					Parser.prototype.parseBlock = function() {
						var node = this.createNode();
						this.expect("{");
						var block = [];
						while (true) {
							if (this.match("}")) break;
							block.push(this.parseStatementListItem());
						}
						this.expect("}");
						return this.finalize(node, new Node.BlockStatement(block));
					};
					Parser.prototype.parseLexicalBinding = function(kind, options) {
						var node = this.createNode();
						var id = this.parsePattern([], kind);
						if (this.context.strict && id.type === syntax_1.Syntax.Identifier) {
							if (this.scanner.isRestrictedWord(id.name)) this.tolerateError(messages_1.Messages.StrictVarName);
						}
						var init = null;
						if (kind === "const") {
							if (!this.matchKeyword("in") && !this.matchContextualKeyword("of")) if (this.match("=")) {
								this.nextToken();
								init = this.isolateCoverGrammar(this.parseAssignmentExpression);
							} else this.throwError(messages_1.Messages.DeclarationMissingInitializer, "const");
						} else if (!options.inFor && id.type !== syntax_1.Syntax.Identifier || this.match("=")) {
							this.expect("=");
							init = this.isolateCoverGrammar(this.parseAssignmentExpression);
						}
						return this.finalize(node, new Node.VariableDeclarator(id, init));
					};
					Parser.prototype.parseBindingList = function(kind, options) {
						var list = [this.parseLexicalBinding(kind, options)];
						while (this.match(",")) {
							this.nextToken();
							list.push(this.parseLexicalBinding(kind, options));
						}
						return list;
					};
					Parser.prototype.isLexicalDeclaration = function() {
						var state = this.scanner.saveState();
						this.scanner.scanComments();
						var next = this.scanner.lex();
						this.scanner.restoreState(state);
						return next.type === 3 || next.type === 7 && next.value === "[" || next.type === 7 && next.value === "{" || next.type === 4 && next.value === "let" || next.type === 4 && next.value === "yield";
					};
					Parser.prototype.parseLexicalDeclaration = function(options) {
						var node = this.createNode();
						var kind = this.nextToken().value;
						assert_1.assert(kind === "let" || kind === "const", "Lexical declaration must be either let or const");
						var declarations = this.parseBindingList(kind, options);
						this.consumeSemicolon();
						return this.finalize(node, new Node.VariableDeclaration(declarations, kind));
					};
					Parser.prototype.parseBindingRestElement = function(params, kind) {
						var node = this.createNode();
						this.expect("...");
						var arg = this.parsePattern(params, kind);
						return this.finalize(node, new Node.RestElement(arg));
					};
					Parser.prototype.parseArrayPattern = function(params, kind) {
						var node = this.createNode();
						this.expect("[");
						var elements = [];
						while (!this.match("]")) if (this.match(",")) {
							this.nextToken();
							elements.push(null);
						} else {
							if (this.match("...")) {
								elements.push(this.parseBindingRestElement(params, kind));
								break;
							} else elements.push(this.parsePatternWithDefault(params, kind));
							if (!this.match("]")) this.expect(",");
						}
						this.expect("]");
						return this.finalize(node, new Node.ArrayPattern(elements));
					};
					Parser.prototype.parsePropertyPattern = function(params, kind) {
						var node = this.createNode();
						var computed = false;
						var shorthand = false;
						var method = false;
						var key;
						var value;
						if (this.lookahead.type === 3) {
							var keyToken = this.lookahead;
							key = this.parseVariableIdentifier();
							var init = this.finalize(node, new Node.Identifier(keyToken.value));
							if (this.match("=")) {
								params.push(keyToken);
								shorthand = true;
								this.nextToken();
								var expr = this.parseAssignmentExpression();
								value = this.finalize(this.startNode(keyToken), new Node.AssignmentPattern(init, expr));
							} else if (!this.match(":")) {
								params.push(keyToken);
								shorthand = true;
								value = init;
							} else {
								this.expect(":");
								value = this.parsePatternWithDefault(params, kind);
							}
						} else {
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							this.expect(":");
							value = this.parsePatternWithDefault(params, kind);
						}
						return this.finalize(node, new Node.Property("init", key, computed, value, method, shorthand));
					};
					Parser.prototype.parseObjectPattern = function(params, kind) {
						var node = this.createNode();
						var properties = [];
						this.expect("{");
						while (!this.match("}")) {
							properties.push(this.parsePropertyPattern(params, kind));
							if (!this.match("}")) this.expect(",");
						}
						this.expect("}");
						return this.finalize(node, new Node.ObjectPattern(properties));
					};
					Parser.prototype.parsePattern = function(params, kind) {
						var pattern;
						if (this.match("[")) pattern = this.parseArrayPattern(params, kind);
						else if (this.match("{")) pattern = this.parseObjectPattern(params, kind);
						else {
							if (this.matchKeyword("let") && (kind === "const" || kind === "let")) this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.LetInLexicalBinding);
							params.push(this.lookahead);
							pattern = this.parseVariableIdentifier(kind);
						}
						return pattern;
					};
					Parser.prototype.parsePatternWithDefault = function(params, kind) {
						var startToken = this.lookahead;
						var pattern = this.parsePattern(params, kind);
						if (this.match("=")) {
							this.nextToken();
							var previousAllowYield = this.context.allowYield;
							this.context.allowYield = true;
							var right = this.isolateCoverGrammar(this.parseAssignmentExpression);
							this.context.allowYield = previousAllowYield;
							pattern = this.finalize(this.startNode(startToken), new Node.AssignmentPattern(pattern, right));
						}
						return pattern;
					};
					Parser.prototype.parseVariableIdentifier = function(kind) {
						var node = this.createNode();
						var token = this.nextToken();
						if (token.type === 4 && token.value === "yield") {
							if (this.context.strict) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictReservedWord);
							else if (!this.context.allowYield) this.throwUnexpectedToken(token);
						} else if (token.type !== 3) {
							if (this.context.strict && token.type === 4 && this.scanner.isStrictModeReservedWord(token.value)) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictReservedWord);
							else if (this.context.strict || token.value !== "let" || kind !== "var") this.throwUnexpectedToken(token);
						} else if ((this.context.isModule || this.context.await) && token.type === 3 && token.value === "await") this.tolerateUnexpectedToken(token);
						return this.finalize(node, new Node.Identifier(token.value));
					};
					Parser.prototype.parseVariableDeclaration = function(options) {
						var node = this.createNode();
						var id = this.parsePattern([], "var");
						if (this.context.strict && id.type === syntax_1.Syntax.Identifier) {
							if (this.scanner.isRestrictedWord(id.name)) this.tolerateError(messages_1.Messages.StrictVarName);
						}
						var init = null;
						if (this.match("=")) {
							this.nextToken();
							init = this.isolateCoverGrammar(this.parseAssignmentExpression);
						} else if (id.type !== syntax_1.Syntax.Identifier && !options.inFor) this.expect("=");
						return this.finalize(node, new Node.VariableDeclarator(id, init));
					};
					Parser.prototype.parseVariableDeclarationList = function(options) {
						var opt = { inFor: options.inFor };
						var list = [];
						list.push(this.parseVariableDeclaration(opt));
						while (this.match(",")) {
							this.nextToken();
							list.push(this.parseVariableDeclaration(opt));
						}
						return list;
					};
					Parser.prototype.parseVariableStatement = function() {
						var node = this.createNode();
						this.expectKeyword("var");
						var declarations = this.parseVariableDeclarationList({ inFor: false });
						this.consumeSemicolon();
						return this.finalize(node, new Node.VariableDeclaration(declarations, "var"));
					};
					Parser.prototype.parseEmptyStatement = function() {
						var node = this.createNode();
						this.expect(";");
						return this.finalize(node, new Node.EmptyStatement());
					};
					Parser.prototype.parseExpressionStatement = function() {
						var node = this.createNode();
						var expr = this.parseExpression();
						this.consumeSemicolon();
						return this.finalize(node, new Node.ExpressionStatement(expr));
					};
					Parser.prototype.parseIfClause = function() {
						if (this.context.strict && this.matchKeyword("function")) this.tolerateError(messages_1.Messages.StrictFunction);
						return this.parseStatement();
					};
					Parser.prototype.parseIfStatement = function() {
						var node = this.createNode();
						var consequent;
						var alternate = null;
						this.expectKeyword("if");
						this.expect("(");
						var test = this.parseExpression();
						if (!this.match(")") && this.config.tolerant) {
							this.tolerateUnexpectedToken(this.nextToken());
							consequent = this.finalize(this.createNode(), new Node.EmptyStatement());
						} else {
							this.expect(")");
							consequent = this.parseIfClause();
							if (this.matchKeyword("else")) {
								this.nextToken();
								alternate = this.parseIfClause();
							}
						}
						return this.finalize(node, new Node.IfStatement(test, consequent, alternate));
					};
					Parser.prototype.parseDoWhileStatement = function() {
						var node = this.createNode();
						this.expectKeyword("do");
						var previousInIteration = this.context.inIteration;
						this.context.inIteration = true;
						var body = this.parseStatement();
						this.context.inIteration = previousInIteration;
						this.expectKeyword("while");
						this.expect("(");
						var test = this.parseExpression();
						if (!this.match(")") && this.config.tolerant) this.tolerateUnexpectedToken(this.nextToken());
						else {
							this.expect(")");
							if (this.match(";")) this.nextToken();
						}
						return this.finalize(node, new Node.DoWhileStatement(body, test));
					};
					Parser.prototype.parseWhileStatement = function() {
						var node = this.createNode();
						var body;
						this.expectKeyword("while");
						this.expect("(");
						var test = this.parseExpression();
						if (!this.match(")") && this.config.tolerant) {
							this.tolerateUnexpectedToken(this.nextToken());
							body = this.finalize(this.createNode(), new Node.EmptyStatement());
						} else {
							this.expect(")");
							var previousInIteration = this.context.inIteration;
							this.context.inIteration = true;
							body = this.parseStatement();
							this.context.inIteration = previousInIteration;
						}
						return this.finalize(node, new Node.WhileStatement(test, body));
					};
					Parser.prototype.parseForStatement = function() {
						var init = null;
						var test = null;
						var update = null;
						var forIn = true;
						var left, right;
						var node = this.createNode();
						this.expectKeyword("for");
						this.expect("(");
						if (this.match(";")) this.nextToken();
						else if (this.matchKeyword("var")) {
							init = this.createNode();
							this.nextToken();
							var previousAllowIn = this.context.allowIn;
							this.context.allowIn = false;
							var declarations = this.parseVariableDeclarationList({ inFor: true });
							this.context.allowIn = previousAllowIn;
							if (declarations.length === 1 && this.matchKeyword("in")) {
								var decl = declarations[0];
								if (decl.init && (decl.id.type === syntax_1.Syntax.ArrayPattern || decl.id.type === syntax_1.Syntax.ObjectPattern || this.context.strict)) this.tolerateError(messages_1.Messages.ForInOfLoopInitializer, "for-in");
								init = this.finalize(init, new Node.VariableDeclaration(declarations, "var"));
								this.nextToken();
								left = init;
								right = this.parseExpression();
								init = null;
							} else if (declarations.length === 1 && declarations[0].init === null && this.matchContextualKeyword("of")) {
								init = this.finalize(init, new Node.VariableDeclaration(declarations, "var"));
								this.nextToken();
								left = init;
								right = this.parseAssignmentExpression();
								init = null;
								forIn = false;
							} else {
								init = this.finalize(init, new Node.VariableDeclaration(declarations, "var"));
								this.expect(";");
							}
						} else if (this.matchKeyword("const") || this.matchKeyword("let")) {
							init = this.createNode();
							var kind = this.nextToken().value;
							if (!this.context.strict && this.lookahead.value === "in") {
								init = this.finalize(init, new Node.Identifier(kind));
								this.nextToken();
								left = init;
								right = this.parseExpression();
								init = null;
							} else {
								var previousAllowIn = this.context.allowIn;
								this.context.allowIn = false;
								var declarations = this.parseBindingList(kind, { inFor: true });
								this.context.allowIn = previousAllowIn;
								if (declarations.length === 1 && declarations[0].init === null && this.matchKeyword("in")) {
									init = this.finalize(init, new Node.VariableDeclaration(declarations, kind));
									this.nextToken();
									left = init;
									right = this.parseExpression();
									init = null;
								} else if (declarations.length === 1 && declarations[0].init === null && this.matchContextualKeyword("of")) {
									init = this.finalize(init, new Node.VariableDeclaration(declarations, kind));
									this.nextToken();
									left = init;
									right = this.parseAssignmentExpression();
									init = null;
									forIn = false;
								} else {
									this.consumeSemicolon();
									init = this.finalize(init, new Node.VariableDeclaration(declarations, kind));
								}
							}
						} else {
							var initStartToken = this.lookahead;
							var previousAllowIn = this.context.allowIn;
							this.context.allowIn = false;
							init = this.inheritCoverGrammar(this.parseAssignmentExpression);
							this.context.allowIn = previousAllowIn;
							if (this.matchKeyword("in")) {
								if (!this.context.isAssignmentTarget || init.type === syntax_1.Syntax.AssignmentExpression) this.tolerateError(messages_1.Messages.InvalidLHSInForIn);
								this.nextToken();
								this.reinterpretExpressionAsPattern(init);
								left = init;
								right = this.parseExpression();
								init = null;
							} else if (this.matchContextualKeyword("of")) {
								if (!this.context.isAssignmentTarget || init.type === syntax_1.Syntax.AssignmentExpression) this.tolerateError(messages_1.Messages.InvalidLHSInForLoop);
								this.nextToken();
								this.reinterpretExpressionAsPattern(init);
								left = init;
								right = this.parseAssignmentExpression();
								init = null;
								forIn = false;
							} else {
								if (this.match(",")) {
									var initSeq = [init];
									while (this.match(",")) {
										this.nextToken();
										initSeq.push(this.isolateCoverGrammar(this.parseAssignmentExpression));
									}
									init = this.finalize(this.startNode(initStartToken), new Node.SequenceExpression(initSeq));
								}
								this.expect(";");
							}
						}
						if (typeof left === "undefined") {
							if (!this.match(";")) test = this.parseExpression();
							this.expect(";");
							if (!this.match(")")) update = this.parseExpression();
						}
						var body;
						if (!this.match(")") && this.config.tolerant) {
							this.tolerateUnexpectedToken(this.nextToken());
							body = this.finalize(this.createNode(), new Node.EmptyStatement());
						} else {
							this.expect(")");
							var previousInIteration = this.context.inIteration;
							this.context.inIteration = true;
							body = this.isolateCoverGrammar(this.parseStatement);
							this.context.inIteration = previousInIteration;
						}
						return typeof left === "undefined" ? this.finalize(node, new Node.ForStatement(init, test, update, body)) : forIn ? this.finalize(node, new Node.ForInStatement(left, right, body)) : this.finalize(node, new Node.ForOfStatement(left, right, body));
					};
					Parser.prototype.parseContinueStatement = function() {
						var node = this.createNode();
						this.expectKeyword("continue");
						var label = null;
						if (this.lookahead.type === 3 && !this.hasLineTerminator) {
							var id = this.parseVariableIdentifier();
							label = id;
							var key = "$" + id.name;
							if (!Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) this.throwError(messages_1.Messages.UnknownLabel, id.name);
						}
						this.consumeSemicolon();
						if (label === null && !this.context.inIteration) this.throwError(messages_1.Messages.IllegalContinue);
						return this.finalize(node, new Node.ContinueStatement(label));
					};
					Parser.prototype.parseBreakStatement = function() {
						var node = this.createNode();
						this.expectKeyword("break");
						var label = null;
						if (this.lookahead.type === 3 && !this.hasLineTerminator) {
							var id = this.parseVariableIdentifier();
							var key = "$" + id.name;
							if (!Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) this.throwError(messages_1.Messages.UnknownLabel, id.name);
							label = id;
						}
						this.consumeSemicolon();
						if (label === null && !this.context.inIteration && !this.context.inSwitch) this.throwError(messages_1.Messages.IllegalBreak);
						return this.finalize(node, new Node.BreakStatement(label));
					};
					Parser.prototype.parseReturnStatement = function() {
						if (!this.context.inFunctionBody) this.tolerateError(messages_1.Messages.IllegalReturn);
						var node = this.createNode();
						this.expectKeyword("return");
						var argument = !this.match(";") && !this.match("}") && !this.hasLineTerminator && this.lookahead.type !== 2 || this.lookahead.type === 8 || this.lookahead.type === 10 ? this.parseExpression() : null;
						this.consumeSemicolon();
						return this.finalize(node, new Node.ReturnStatement(argument));
					};
					Parser.prototype.parseWithStatement = function() {
						if (this.context.strict) this.tolerateError(messages_1.Messages.StrictModeWith);
						var node = this.createNode();
						var body;
						this.expectKeyword("with");
						this.expect("(");
						var object = this.parseExpression();
						if (!this.match(")") && this.config.tolerant) {
							this.tolerateUnexpectedToken(this.nextToken());
							body = this.finalize(this.createNode(), new Node.EmptyStatement());
						} else {
							this.expect(")");
							body = this.parseStatement();
						}
						return this.finalize(node, new Node.WithStatement(object, body));
					};
					Parser.prototype.parseSwitchCase = function() {
						var node = this.createNode();
						var test;
						if (this.matchKeyword("default")) {
							this.nextToken();
							test = null;
						} else {
							this.expectKeyword("case");
							test = this.parseExpression();
						}
						this.expect(":");
						var consequent = [];
						while (true) {
							if (this.match("}") || this.matchKeyword("default") || this.matchKeyword("case")) break;
							consequent.push(this.parseStatementListItem());
						}
						return this.finalize(node, new Node.SwitchCase(test, consequent));
					};
					Parser.prototype.parseSwitchStatement = function() {
						var node = this.createNode();
						this.expectKeyword("switch");
						this.expect("(");
						var discriminant = this.parseExpression();
						this.expect(")");
						var previousInSwitch = this.context.inSwitch;
						this.context.inSwitch = true;
						var cases = [];
						var defaultFound = false;
						this.expect("{");
						while (true) {
							if (this.match("}")) break;
							var clause = this.parseSwitchCase();
							if (clause.test === null) {
								if (defaultFound) this.throwError(messages_1.Messages.MultipleDefaultsInSwitch);
								defaultFound = true;
							}
							cases.push(clause);
						}
						this.expect("}");
						this.context.inSwitch = previousInSwitch;
						return this.finalize(node, new Node.SwitchStatement(discriminant, cases));
					};
					Parser.prototype.parseLabelledStatement = function() {
						var node = this.createNode();
						var expr = this.parseExpression();
						var statement;
						if (expr.type === syntax_1.Syntax.Identifier && this.match(":")) {
							this.nextToken();
							var id = expr;
							var key = "$" + id.name;
							if (Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) this.throwError(messages_1.Messages.Redeclaration, "Label", id.name);
							this.context.labelSet[key] = true;
							var body = void 0;
							if (this.matchKeyword("class")) {
								this.tolerateUnexpectedToken(this.lookahead);
								body = this.parseClassDeclaration();
							} else if (this.matchKeyword("function")) {
								var token = this.lookahead;
								var declaration = this.parseFunctionDeclaration();
								if (this.context.strict) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictFunction);
								else if (declaration.generator) this.tolerateUnexpectedToken(token, messages_1.Messages.GeneratorInLegacyContext);
								body = declaration;
							} else body = this.parseStatement();
							delete this.context.labelSet[key];
							statement = new Node.LabeledStatement(id, body);
						} else {
							this.consumeSemicolon();
							statement = new Node.ExpressionStatement(expr);
						}
						return this.finalize(node, statement);
					};
					Parser.prototype.parseThrowStatement = function() {
						var node = this.createNode();
						this.expectKeyword("throw");
						if (this.hasLineTerminator) this.throwError(messages_1.Messages.NewlineAfterThrow);
						var argument = this.parseExpression();
						this.consumeSemicolon();
						return this.finalize(node, new Node.ThrowStatement(argument));
					};
					Parser.prototype.parseCatchClause = function() {
						var node = this.createNode();
						this.expectKeyword("catch");
						this.expect("(");
						if (this.match(")")) this.throwUnexpectedToken(this.lookahead);
						var params = [];
						var param = this.parsePattern(params);
						var paramMap = {};
						for (var i = 0; i < params.length; i++) {
							var key = "$" + params[i].value;
							if (Object.prototype.hasOwnProperty.call(paramMap, key)) this.tolerateError(messages_1.Messages.DuplicateBinding, params[i].value);
							paramMap[key] = true;
						}
						if (this.context.strict && param.type === syntax_1.Syntax.Identifier) {
							if (this.scanner.isRestrictedWord(param.name)) this.tolerateError(messages_1.Messages.StrictCatchVariable);
						}
						this.expect(")");
						var body = this.parseBlock();
						return this.finalize(node, new Node.CatchClause(param, body));
					};
					Parser.prototype.parseFinallyClause = function() {
						this.expectKeyword("finally");
						return this.parseBlock();
					};
					Parser.prototype.parseTryStatement = function() {
						var node = this.createNode();
						this.expectKeyword("try");
						var block = this.parseBlock();
						var handler = this.matchKeyword("catch") ? this.parseCatchClause() : null;
						var finalizer = this.matchKeyword("finally") ? this.parseFinallyClause() : null;
						if (!handler && !finalizer) this.throwError(messages_1.Messages.NoCatchOrFinally);
						return this.finalize(node, new Node.TryStatement(block, handler, finalizer));
					};
					Parser.prototype.parseDebuggerStatement = function() {
						var node = this.createNode();
						this.expectKeyword("debugger");
						this.consumeSemicolon();
						return this.finalize(node, new Node.DebuggerStatement());
					};
					Parser.prototype.parseStatement = function() {
						var statement;
						switch (this.lookahead.type) {
							case 1:
							case 5:
							case 6:
							case 8:
							case 10:
							case 9:
								statement = this.parseExpressionStatement();
								break;
							case 7:
								var value = this.lookahead.value;
								if (value === "{") statement = this.parseBlock();
								else if (value === "(") statement = this.parseExpressionStatement();
								else if (value === ";") statement = this.parseEmptyStatement();
								else statement = this.parseExpressionStatement();
								break;
							case 3:
								statement = this.matchAsyncFunction() ? this.parseFunctionDeclaration() : this.parseLabelledStatement();
								break;
							case 4:
								switch (this.lookahead.value) {
									case "break":
										statement = this.parseBreakStatement();
										break;
									case "continue":
										statement = this.parseContinueStatement();
										break;
									case "debugger":
										statement = this.parseDebuggerStatement();
										break;
									case "do":
										statement = this.parseDoWhileStatement();
										break;
									case "for":
										statement = this.parseForStatement();
										break;
									case "function":
										statement = this.parseFunctionDeclaration();
										break;
									case "if":
										statement = this.parseIfStatement();
										break;
									case "return":
										statement = this.parseReturnStatement();
										break;
									case "switch":
										statement = this.parseSwitchStatement();
										break;
									case "throw":
										statement = this.parseThrowStatement();
										break;
									case "try":
										statement = this.parseTryStatement();
										break;
									case "var":
										statement = this.parseVariableStatement();
										break;
									case "while":
										statement = this.parseWhileStatement();
										break;
									case "with":
										statement = this.parseWithStatement();
										break;
									default:
										statement = this.parseExpressionStatement();
										break;
								}
								break;
							default: statement = this.throwUnexpectedToken(this.lookahead);
						}
						return statement;
					};
					Parser.prototype.parseFunctionSourceElements = function() {
						var node = this.createNode();
						this.expect("{");
						var body = this.parseDirectivePrologues();
						var previousLabelSet = this.context.labelSet;
						var previousInIteration = this.context.inIteration;
						var previousInSwitch = this.context.inSwitch;
						var previousInFunctionBody = this.context.inFunctionBody;
						this.context.labelSet = {};
						this.context.inIteration = false;
						this.context.inSwitch = false;
						this.context.inFunctionBody = true;
						while (this.lookahead.type !== 2) {
							if (this.match("}")) break;
							body.push(this.parseStatementListItem());
						}
						this.expect("}");
						this.context.labelSet = previousLabelSet;
						this.context.inIteration = previousInIteration;
						this.context.inSwitch = previousInSwitch;
						this.context.inFunctionBody = previousInFunctionBody;
						return this.finalize(node, new Node.BlockStatement(body));
					};
					Parser.prototype.validateParam = function(options, param, name) {
						var key = "$" + name;
						if (this.context.strict) {
							if (this.scanner.isRestrictedWord(name)) {
								options.stricted = param;
								options.message = messages_1.Messages.StrictParamName;
							}
							if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
								options.stricted = param;
								options.message = messages_1.Messages.StrictParamDupe;
							}
						} else if (!options.firstRestricted) {
							if (this.scanner.isRestrictedWord(name)) {
								options.firstRestricted = param;
								options.message = messages_1.Messages.StrictParamName;
							} else if (this.scanner.isStrictModeReservedWord(name)) {
								options.firstRestricted = param;
								options.message = messages_1.Messages.StrictReservedWord;
							} else if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
								options.stricted = param;
								options.message = messages_1.Messages.StrictParamDupe;
							}
						}
						/* istanbul ignore next */
						if (typeof Object.defineProperty === "function") Object.defineProperty(options.paramSet, key, {
							value: true,
							enumerable: true,
							writable: true,
							configurable: true
						});
						else options.paramSet[key] = true;
					};
					Parser.prototype.parseRestElement = function(params) {
						var node = this.createNode();
						this.expect("...");
						var arg = this.parsePattern(params);
						if (this.match("=")) this.throwError(messages_1.Messages.DefaultRestParameter);
						if (!this.match(")")) this.throwError(messages_1.Messages.ParameterAfterRestParameter);
						return this.finalize(node, new Node.RestElement(arg));
					};
					Parser.prototype.parseFormalParameter = function(options) {
						var params = [];
						var param = this.match("...") ? this.parseRestElement(params) : this.parsePatternWithDefault(params);
						for (var i = 0; i < params.length; i++) this.validateParam(options, params[i], params[i].value);
						options.simple = options.simple && param instanceof Node.Identifier;
						options.params.push(param);
					};
					Parser.prototype.parseFormalParameters = function(firstRestricted) {
						var options = {
							simple: true,
							params: [],
							firstRestricted
						};
						this.expect("(");
						if (!this.match(")")) {
							options.paramSet = {};
							while (this.lookahead.type !== 2) {
								this.parseFormalParameter(options);
								if (this.match(")")) break;
								this.expect(",");
								if (this.match(")")) break;
							}
						}
						this.expect(")");
						return {
							simple: options.simple,
							params: options.params,
							stricted: options.stricted,
							firstRestricted: options.firstRestricted,
							message: options.message
						};
					};
					Parser.prototype.matchAsyncFunction = function() {
						var match = this.matchContextualKeyword("async");
						if (match) {
							var state = this.scanner.saveState();
							this.scanner.scanComments();
							var next = this.scanner.lex();
							this.scanner.restoreState(state);
							match = state.lineNumber === next.lineNumber && next.type === 4 && next.value === "function";
						}
						return match;
					};
					Parser.prototype.parseFunctionDeclaration = function(identifierIsOptional) {
						var node = this.createNode();
						var isAsync = this.matchContextualKeyword("async");
						if (isAsync) this.nextToken();
						this.expectKeyword("function");
						var isGenerator = isAsync ? false : this.match("*");
						if (isGenerator) this.nextToken();
						var message;
						var id = null;
						var firstRestricted = null;
						if (!identifierIsOptional || !this.match("(")) {
							var token = this.lookahead;
							id = this.parseVariableIdentifier();
							if (this.context.strict) {
								if (this.scanner.isRestrictedWord(token.value)) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictFunctionName);
							} else if (this.scanner.isRestrictedWord(token.value)) {
								firstRestricted = token;
								message = messages_1.Messages.StrictFunctionName;
							} else if (this.scanner.isStrictModeReservedWord(token.value)) {
								firstRestricted = token;
								message = messages_1.Messages.StrictReservedWord;
							}
						}
						var previousAllowAwait = this.context.await;
						var previousAllowYield = this.context.allowYield;
						this.context.await = isAsync;
						this.context.allowYield = !isGenerator;
						var formalParameters = this.parseFormalParameters(firstRestricted);
						var params = formalParameters.params;
						var stricted = formalParameters.stricted;
						firstRestricted = formalParameters.firstRestricted;
						if (formalParameters.message) message = formalParameters.message;
						var previousStrict = this.context.strict;
						var previousAllowStrictDirective = this.context.allowStrictDirective;
						this.context.allowStrictDirective = formalParameters.simple;
						var body = this.parseFunctionSourceElements();
						if (this.context.strict && firstRestricted) this.throwUnexpectedToken(firstRestricted, message);
						if (this.context.strict && stricted) this.tolerateUnexpectedToken(stricted, message);
						this.context.strict = previousStrict;
						this.context.allowStrictDirective = previousAllowStrictDirective;
						this.context.await = previousAllowAwait;
						this.context.allowYield = previousAllowYield;
						return isAsync ? this.finalize(node, new Node.AsyncFunctionDeclaration(id, params, body)) : this.finalize(node, new Node.FunctionDeclaration(id, params, body, isGenerator));
					};
					Parser.prototype.parseFunctionExpression = function() {
						var node = this.createNode();
						var isAsync = this.matchContextualKeyword("async");
						if (isAsync) this.nextToken();
						this.expectKeyword("function");
						var isGenerator = isAsync ? false : this.match("*");
						if (isGenerator) this.nextToken();
						var message;
						var id = null;
						var firstRestricted;
						var previousAllowAwait = this.context.await;
						var previousAllowYield = this.context.allowYield;
						this.context.await = isAsync;
						this.context.allowYield = !isGenerator;
						if (!this.match("(")) {
							var token = this.lookahead;
							id = !this.context.strict && !isGenerator && this.matchKeyword("yield") ? this.parseIdentifierName() : this.parseVariableIdentifier();
							if (this.context.strict) {
								if (this.scanner.isRestrictedWord(token.value)) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictFunctionName);
							} else if (this.scanner.isRestrictedWord(token.value)) {
								firstRestricted = token;
								message = messages_1.Messages.StrictFunctionName;
							} else if (this.scanner.isStrictModeReservedWord(token.value)) {
								firstRestricted = token;
								message = messages_1.Messages.StrictReservedWord;
							}
						}
						var formalParameters = this.parseFormalParameters(firstRestricted);
						var params = formalParameters.params;
						var stricted = formalParameters.stricted;
						firstRestricted = formalParameters.firstRestricted;
						if (formalParameters.message) message = formalParameters.message;
						var previousStrict = this.context.strict;
						var previousAllowStrictDirective = this.context.allowStrictDirective;
						this.context.allowStrictDirective = formalParameters.simple;
						var body = this.parseFunctionSourceElements();
						if (this.context.strict && firstRestricted) this.throwUnexpectedToken(firstRestricted, message);
						if (this.context.strict && stricted) this.tolerateUnexpectedToken(stricted, message);
						this.context.strict = previousStrict;
						this.context.allowStrictDirective = previousAllowStrictDirective;
						this.context.await = previousAllowAwait;
						this.context.allowYield = previousAllowYield;
						return isAsync ? this.finalize(node, new Node.AsyncFunctionExpression(id, params, body)) : this.finalize(node, new Node.FunctionExpression(id, params, body, isGenerator));
					};
					Parser.prototype.parseDirective = function() {
						var token = this.lookahead;
						var node = this.createNode();
						var expr = this.parseExpression();
						var directive = expr.type === syntax_1.Syntax.Literal ? this.getTokenRaw(token).slice(1, -1) : null;
						this.consumeSemicolon();
						return this.finalize(node, directive ? new Node.Directive(expr, directive) : new Node.ExpressionStatement(expr));
					};
					Parser.prototype.parseDirectivePrologues = function() {
						var firstRestricted = null;
						var body = [];
						while (true) {
							var token = this.lookahead;
							if (token.type !== 8) break;
							var statement = this.parseDirective();
							body.push(statement);
							var directive = statement.directive;
							if (typeof directive !== "string") break;
							if (directive === "use strict") {
								this.context.strict = true;
								if (firstRestricted) this.tolerateUnexpectedToken(firstRestricted, messages_1.Messages.StrictOctalLiteral);
								if (!this.context.allowStrictDirective) this.tolerateUnexpectedToken(token, messages_1.Messages.IllegalLanguageModeDirective);
							} else if (!firstRestricted && token.octal) firstRestricted = token;
						}
						return body;
					};
					Parser.prototype.qualifiedPropertyName = function(token) {
						switch (token.type) {
							case 3:
							case 8:
							case 1:
							case 5:
							case 6:
							case 4: return true;
							case 7: return token.value === "[";
							default: break;
						}
						return false;
					};
					Parser.prototype.parseGetterMethod = function() {
						var node = this.createNode();
						var isGenerator = false;
						var previousAllowYield = this.context.allowYield;
						this.context.allowYield = !isGenerator;
						var formalParameters = this.parseFormalParameters();
						if (formalParameters.params.length > 0) this.tolerateError(messages_1.Messages.BadGetterArity);
						var method = this.parsePropertyMethod(formalParameters);
						this.context.allowYield = previousAllowYield;
						return this.finalize(node, new Node.FunctionExpression(null, formalParameters.params, method, isGenerator));
					};
					Parser.prototype.parseSetterMethod = function() {
						var node = this.createNode();
						var isGenerator = false;
						var previousAllowYield = this.context.allowYield;
						this.context.allowYield = !isGenerator;
						var formalParameters = this.parseFormalParameters();
						if (formalParameters.params.length !== 1) this.tolerateError(messages_1.Messages.BadSetterArity);
						else if (formalParameters.params[0] instanceof Node.RestElement) this.tolerateError(messages_1.Messages.BadSetterRestParameter);
						var method = this.parsePropertyMethod(formalParameters);
						this.context.allowYield = previousAllowYield;
						return this.finalize(node, new Node.FunctionExpression(null, formalParameters.params, method, isGenerator));
					};
					Parser.prototype.parseGeneratorMethod = function() {
						var node = this.createNode();
						var isGenerator = true;
						var previousAllowYield = this.context.allowYield;
						this.context.allowYield = true;
						var params = this.parseFormalParameters();
						this.context.allowYield = false;
						var method = this.parsePropertyMethod(params);
						this.context.allowYield = previousAllowYield;
						return this.finalize(node, new Node.FunctionExpression(null, params.params, method, isGenerator));
					};
					Parser.prototype.isStartOfExpression = function() {
						var start = true;
						var value = this.lookahead.value;
						switch (this.lookahead.type) {
							case 7:
								start = value === "[" || value === "(" || value === "{" || value === "+" || value === "-" || value === "!" || value === "~" || value === "++" || value === "--" || value === "/" || value === "/=";
								break;
							case 4:
								start = value === "class" || value === "delete" || value === "function" || value === "let" || value === "new" || value === "super" || value === "this" || value === "typeof" || value === "void" || value === "yield";
								break;
							default: break;
						}
						return start;
					};
					Parser.prototype.parseYieldExpression = function() {
						var node = this.createNode();
						this.expectKeyword("yield");
						var argument = null;
						var delegate = false;
						if (!this.hasLineTerminator) {
							var previousAllowYield = this.context.allowYield;
							this.context.allowYield = false;
							delegate = this.match("*");
							if (delegate) {
								this.nextToken();
								argument = this.parseAssignmentExpression();
							} else if (this.isStartOfExpression()) argument = this.parseAssignmentExpression();
							this.context.allowYield = previousAllowYield;
						}
						return this.finalize(node, new Node.YieldExpression(argument, delegate));
					};
					Parser.prototype.parseClassElement = function(hasConstructor) {
						var token = this.lookahead;
						var node = this.createNode();
						var kind = "";
						var key = null;
						var value = null;
						var computed = false;
						var method = false;
						var isStatic = false;
						var isAsync = false;
						if (this.match("*")) this.nextToken();
						else {
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							if (key.name === "static" && (this.qualifiedPropertyName(this.lookahead) || this.match("*"))) {
								token = this.lookahead;
								isStatic = true;
								computed = this.match("[");
								if (this.match("*")) this.nextToken();
								else key = this.parseObjectPropertyKey();
							}
							if (token.type === 3 && !this.hasLineTerminator && token.value === "async") {
								var punctuator = this.lookahead.value;
								if (punctuator !== ":" && punctuator !== "(" && punctuator !== "*") {
									isAsync = true;
									token = this.lookahead;
									key = this.parseObjectPropertyKey();
									if (token.type === 3 && token.value === "constructor") this.tolerateUnexpectedToken(token, messages_1.Messages.ConstructorIsAsync);
								}
							}
						}
						var lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
						if (token.type === 3) {
							if (token.value === "get" && lookaheadPropertyKey) {
								kind = "get";
								computed = this.match("[");
								key = this.parseObjectPropertyKey();
								this.context.allowYield = false;
								value = this.parseGetterMethod();
							} else if (token.value === "set" && lookaheadPropertyKey) {
								kind = "set";
								computed = this.match("[");
								key = this.parseObjectPropertyKey();
								value = this.parseSetterMethod();
							}
						} else if (token.type === 7 && token.value === "*" && lookaheadPropertyKey) {
							kind = "init";
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							value = this.parseGeneratorMethod();
							method = true;
						}
						if (!kind && key && this.match("(")) {
							kind = "init";
							value = isAsync ? this.parsePropertyMethodAsyncFunction() : this.parsePropertyMethodFunction();
							method = true;
						}
						if (!kind) this.throwUnexpectedToken(this.lookahead);
						if (kind === "init") kind = "method";
						if (!computed) {
							if (isStatic && this.isPropertyKey(key, "prototype")) this.throwUnexpectedToken(token, messages_1.Messages.StaticPrototype);
							if (!isStatic && this.isPropertyKey(key, "constructor")) {
								if (kind !== "method" || !method || value && value.generator) this.throwUnexpectedToken(token, messages_1.Messages.ConstructorSpecialMethod);
								if (hasConstructor.value) this.throwUnexpectedToken(token, messages_1.Messages.DuplicateConstructor);
								else hasConstructor.value = true;
								kind = "constructor";
							}
						}
						return this.finalize(node, new Node.MethodDefinition(key, computed, value, kind, isStatic));
					};
					Parser.prototype.parseClassElementList = function() {
						var body = [];
						var hasConstructor = { value: false };
						this.expect("{");
						while (!this.match("}")) if (this.match(";")) this.nextToken();
						else body.push(this.parseClassElement(hasConstructor));
						this.expect("}");
						return body;
					};
					Parser.prototype.parseClassBody = function() {
						var node = this.createNode();
						var elementList = this.parseClassElementList();
						return this.finalize(node, new Node.ClassBody(elementList));
					};
					Parser.prototype.parseClassDeclaration = function(identifierIsOptional) {
						var node = this.createNode();
						var previousStrict = this.context.strict;
						this.context.strict = true;
						this.expectKeyword("class");
						var id = identifierIsOptional && this.lookahead.type !== 3 ? null : this.parseVariableIdentifier();
						var superClass = null;
						if (this.matchKeyword("extends")) {
							this.nextToken();
							superClass = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
						}
						var classBody = this.parseClassBody();
						this.context.strict = previousStrict;
						return this.finalize(node, new Node.ClassDeclaration(id, superClass, classBody));
					};
					Parser.prototype.parseClassExpression = function() {
						var node = this.createNode();
						var previousStrict = this.context.strict;
						this.context.strict = true;
						this.expectKeyword("class");
						var id = this.lookahead.type === 3 ? this.parseVariableIdentifier() : null;
						var superClass = null;
						if (this.matchKeyword("extends")) {
							this.nextToken();
							superClass = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
						}
						var classBody = this.parseClassBody();
						this.context.strict = previousStrict;
						return this.finalize(node, new Node.ClassExpression(id, superClass, classBody));
					};
					Parser.prototype.parseModule = function() {
						this.context.strict = true;
						this.context.isModule = true;
						this.scanner.isModule = true;
						var node = this.createNode();
						var body = this.parseDirectivePrologues();
						while (this.lookahead.type !== 2) body.push(this.parseStatementListItem());
						return this.finalize(node, new Node.Module(body));
					};
					Parser.prototype.parseScript = function() {
						var node = this.createNode();
						var body = this.parseDirectivePrologues();
						while (this.lookahead.type !== 2) body.push(this.parseStatementListItem());
						return this.finalize(node, new Node.Script(body));
					};
					Parser.prototype.parseModuleSpecifier = function() {
						var node = this.createNode();
						if (this.lookahead.type !== 8) this.throwError(messages_1.Messages.InvalidModuleSpecifier);
						var token = this.nextToken();
						var raw = this.getTokenRaw(token);
						return this.finalize(node, new Node.Literal(token.value, raw));
					};
					Parser.prototype.parseImportSpecifier = function() {
						var node = this.createNode();
						var imported;
						var local;
						if (this.lookahead.type === 3) {
							imported = this.parseVariableIdentifier();
							local = imported;
							if (this.matchContextualKeyword("as")) {
								this.nextToken();
								local = this.parseVariableIdentifier();
							}
						} else {
							imported = this.parseIdentifierName();
							local = imported;
							if (this.matchContextualKeyword("as")) {
								this.nextToken();
								local = this.parseVariableIdentifier();
							} else this.throwUnexpectedToken(this.nextToken());
						}
						return this.finalize(node, new Node.ImportSpecifier(local, imported));
					};
					Parser.prototype.parseNamedImports = function() {
						this.expect("{");
						var specifiers = [];
						while (!this.match("}")) {
							specifiers.push(this.parseImportSpecifier());
							if (!this.match("}")) this.expect(",");
						}
						this.expect("}");
						return specifiers;
					};
					Parser.prototype.parseImportDefaultSpecifier = function() {
						var node = this.createNode();
						var local = this.parseIdentifierName();
						return this.finalize(node, new Node.ImportDefaultSpecifier(local));
					};
					Parser.prototype.parseImportNamespaceSpecifier = function() {
						var node = this.createNode();
						this.expect("*");
						if (!this.matchContextualKeyword("as")) this.throwError(messages_1.Messages.NoAsAfterImportNamespace);
						this.nextToken();
						var local = this.parseIdentifierName();
						return this.finalize(node, new Node.ImportNamespaceSpecifier(local));
					};
					Parser.prototype.parseImportDeclaration = function() {
						if (this.context.inFunctionBody) this.throwError(messages_1.Messages.IllegalImportDeclaration);
						var node = this.createNode();
						this.expectKeyword("import");
						var src;
						var specifiers = [];
						if (this.lookahead.type === 8) src = this.parseModuleSpecifier();
						else {
							if (this.match("{")) specifiers = specifiers.concat(this.parseNamedImports());
							else if (this.match("*")) specifiers.push(this.parseImportNamespaceSpecifier());
							else if (this.isIdentifierName(this.lookahead) && !this.matchKeyword("default")) {
								specifiers.push(this.parseImportDefaultSpecifier());
								if (this.match(",")) {
									this.nextToken();
									if (this.match("*")) specifiers.push(this.parseImportNamespaceSpecifier());
									else if (this.match("{")) specifiers = specifiers.concat(this.parseNamedImports());
									else this.throwUnexpectedToken(this.lookahead);
								}
							} else this.throwUnexpectedToken(this.nextToken());
							if (!this.matchContextualKeyword("from")) {
								var message = this.lookahead.value ? messages_1.Messages.UnexpectedToken : messages_1.Messages.MissingFromClause;
								this.throwError(message, this.lookahead.value);
							}
							this.nextToken();
							src = this.parseModuleSpecifier();
						}
						this.consumeSemicolon();
						return this.finalize(node, new Node.ImportDeclaration(specifiers, src));
					};
					Parser.prototype.parseExportSpecifier = function() {
						var node = this.createNode();
						var local = this.parseIdentifierName();
						var exported = local;
						if (this.matchContextualKeyword("as")) {
							this.nextToken();
							exported = this.parseIdentifierName();
						}
						return this.finalize(node, new Node.ExportSpecifier(local, exported));
					};
					Parser.prototype.parseExportDeclaration = function() {
						if (this.context.inFunctionBody) this.throwError(messages_1.Messages.IllegalExportDeclaration);
						var node = this.createNode();
						this.expectKeyword("export");
						var exportDeclaration;
						if (this.matchKeyword("default")) {
							this.nextToken();
							if (this.matchKeyword("function")) {
								var declaration = this.parseFunctionDeclaration(true);
								exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
							} else if (this.matchKeyword("class")) {
								var declaration = this.parseClassDeclaration(true);
								exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
							} else if (this.matchContextualKeyword("async")) {
								var declaration = this.matchAsyncFunction() ? this.parseFunctionDeclaration(true) : this.parseAssignmentExpression();
								exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
							} else {
								if (this.matchContextualKeyword("from")) this.throwError(messages_1.Messages.UnexpectedToken, this.lookahead.value);
								var declaration = this.match("{") ? this.parseObjectInitializer() : this.match("[") ? this.parseArrayInitializer() : this.parseAssignmentExpression();
								this.consumeSemicolon();
								exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
							}
						} else if (this.match("*")) {
							this.nextToken();
							if (!this.matchContextualKeyword("from")) {
								var message = this.lookahead.value ? messages_1.Messages.UnexpectedToken : messages_1.Messages.MissingFromClause;
								this.throwError(message, this.lookahead.value);
							}
							this.nextToken();
							var src = this.parseModuleSpecifier();
							this.consumeSemicolon();
							exportDeclaration = this.finalize(node, new Node.ExportAllDeclaration(src));
						} else if (this.lookahead.type === 4) {
							var declaration = void 0;
							switch (this.lookahead.value) {
								case "let":
								case "const":
									declaration = this.parseLexicalDeclaration({ inFor: false });
									break;
								case "var":
								case "class":
								case "function":
									declaration = this.parseStatementListItem();
									break;
								default: this.throwUnexpectedToken(this.lookahead);
							}
							exportDeclaration = this.finalize(node, new Node.ExportNamedDeclaration(declaration, [], null));
						} else if (this.matchAsyncFunction()) {
							var declaration = this.parseFunctionDeclaration();
							exportDeclaration = this.finalize(node, new Node.ExportNamedDeclaration(declaration, [], null));
						} else {
							var specifiers = [];
							var source = null;
							var isExportFromIdentifier = false;
							this.expect("{");
							while (!this.match("}")) {
								isExportFromIdentifier = isExportFromIdentifier || this.matchKeyword("default");
								specifiers.push(this.parseExportSpecifier());
								if (!this.match("}")) this.expect(",");
							}
							this.expect("}");
							if (this.matchContextualKeyword("from")) {
								this.nextToken();
								source = this.parseModuleSpecifier();
								this.consumeSemicolon();
							} else if (isExportFromIdentifier) {
								var message = this.lookahead.value ? messages_1.Messages.UnexpectedToken : messages_1.Messages.MissingFromClause;
								this.throwError(message, this.lookahead.value);
							} else this.consumeSemicolon();
							exportDeclaration = this.finalize(node, new Node.ExportNamedDeclaration(null, specifiers, source));
						}
						return exportDeclaration;
					};
					return Parser;
				}();
			},
			function(module$11, exports$10) {
				"use strict";
				Object.defineProperty(exports$10, "__esModule", { value: true });
				function assert(condition, message) {
					/* istanbul ignore if */
					if (!condition) throw new Error("ASSERT: " + message);
				}
				exports$10.assert = assert;
			},
			function(module$12, exports$11) {
				"use strict";
				Object.defineProperty(exports$11, "__esModule", { value: true });
				exports$11.ErrorHandler = function() {
					function ErrorHandler() {
						this.errors = [];
						this.tolerant = false;
					}
					ErrorHandler.prototype.recordError = function(error) {
						this.errors.push(error);
					};
					ErrorHandler.prototype.tolerate = function(error) {
						if (this.tolerant) this.recordError(error);
						else throw error;
					};
					ErrorHandler.prototype.constructError = function(msg, column) {
						var error = new Error(msg);
						try {
							throw error;
						} catch (base) {
							/* istanbul ignore else */
							if (Object.create && Object.defineProperty) {
								error = Object.create(base);
								Object.defineProperty(error, "column", { value: column });
							}
						}
						/* istanbul ignore next */
						return error;
					};
					ErrorHandler.prototype.createError = function(index, line, col, description) {
						var msg = "Line " + line + ": " + description;
						var error = this.constructError(msg, col);
						error.index = index;
						error.lineNumber = line;
						error.description = description;
						return error;
					};
					ErrorHandler.prototype.throwError = function(index, line, col, description) {
						throw this.createError(index, line, col, description);
					};
					ErrorHandler.prototype.tolerateError = function(index, line, col, description) {
						var error = this.createError(index, line, col, description);
						if (this.tolerant) this.recordError(error);
						else throw error;
					};
					return ErrorHandler;
				}();
			},
			function(module$13, exports$12) {
				"use strict";
				Object.defineProperty(exports$12, "__esModule", { value: true });
				exports$12.Messages = {
					BadGetterArity: "Getter must not have any formal parameters",
					BadSetterArity: "Setter must have exactly one formal parameter",
					BadSetterRestParameter: "Setter function argument must not be a rest parameter",
					ConstructorIsAsync: "Class constructor may not be an async method",
					ConstructorSpecialMethod: "Class constructor may not be an accessor",
					DeclarationMissingInitializer: "Missing initializer in %0 declaration",
					DefaultRestParameter: "Unexpected token =",
					DuplicateBinding: "Duplicate binding %0",
					DuplicateConstructor: "A class may only have one constructor",
					DuplicateProtoProperty: "Duplicate __proto__ fields are not allowed in object literals",
					ForInOfLoopInitializer: "%0 loop variable declaration may not have an initializer",
					GeneratorInLegacyContext: "Generator declarations are not allowed in legacy contexts",
					IllegalBreak: "Illegal break statement",
					IllegalContinue: "Illegal continue statement",
					IllegalExportDeclaration: "Unexpected token",
					IllegalImportDeclaration: "Unexpected token",
					IllegalLanguageModeDirective: "Illegal 'use strict' directive in function with non-simple parameter list",
					IllegalReturn: "Illegal return statement",
					InvalidEscapedReservedWord: "Keyword must not contain escaped characters",
					InvalidHexEscapeSequence: "Invalid hexadecimal escape sequence",
					InvalidLHSInAssignment: "Invalid left-hand side in assignment",
					InvalidLHSInForIn: "Invalid left-hand side in for-in",
					InvalidLHSInForLoop: "Invalid left-hand side in for-loop",
					InvalidModuleSpecifier: "Unexpected token",
					InvalidRegExp: "Invalid regular expression",
					LetInLexicalBinding: "let is disallowed as a lexically bound name",
					MissingFromClause: "Unexpected token",
					MultipleDefaultsInSwitch: "More than one default clause in switch statement",
					NewlineAfterThrow: "Illegal newline after throw",
					NoAsAfterImportNamespace: "Unexpected token",
					NoCatchOrFinally: "Missing catch or finally after try",
					ParameterAfterRestParameter: "Rest parameter must be last formal parameter",
					Redeclaration: "%0 '%1' has already been declared",
					StaticPrototype: "Classes may not have static property named prototype",
					StrictCatchVariable: "Catch variable may not be eval or arguments in strict mode",
					StrictDelete: "Delete of an unqualified identifier in strict mode.",
					StrictFunction: "In strict mode code, functions can only be declared at top level or inside a block",
					StrictFunctionName: "Function name may not be eval or arguments in strict mode",
					StrictLHSAssignment: "Assignment to eval or arguments is not allowed in strict mode",
					StrictLHSPostfix: "Postfix increment/decrement may not have eval or arguments operand in strict mode",
					StrictLHSPrefix: "Prefix increment/decrement may not have eval or arguments operand in strict mode",
					StrictModeWith: "Strict mode code may not include a with statement",
					StrictOctalLiteral: "Octal literals are not allowed in strict mode.",
					StrictParamDupe: "Strict mode function may not have duplicate parameter names",
					StrictParamName: "Parameter name eval or arguments is not allowed in strict mode",
					StrictReservedWord: "Use of future reserved word in strict mode",
					StrictVarName: "Variable name may not be eval or arguments in strict mode",
					TemplateOctalLiteral: "Octal literals are not allowed in template strings.",
					UnexpectedEOS: "Unexpected end of input",
					UnexpectedIdentifier: "Unexpected identifier",
					UnexpectedNumber: "Unexpected number",
					UnexpectedReserved: "Unexpected reserved word",
					UnexpectedString: "Unexpected string",
					UnexpectedTemplate: "Unexpected quasi %0",
					UnexpectedToken: "Unexpected token %0",
					UnexpectedTokenIllegal: "Unexpected token ILLEGAL",
					UnknownLabel: "Undefined label '%0'",
					UnterminatedRegExp: "Invalid regular expression: missing /"
				};
			},
			function(module$14, exports$13, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$13, "__esModule", { value: true });
				var assert_1 = __webpack_require__(9);
				var character_1 = __webpack_require__(4);
				var messages_1 = __webpack_require__(11);
				function hexValue(ch) {
					return "0123456789abcdef".indexOf(ch.toLowerCase());
				}
				function octalValue(ch) {
					return "01234567".indexOf(ch);
				}
				exports$13.Scanner = function() {
					function Scanner(code, handler) {
						this.source = code;
						this.errorHandler = handler;
						this.trackComment = false;
						this.isModule = false;
						this.length = code.length;
						this.index = 0;
						this.lineNumber = code.length > 0 ? 1 : 0;
						this.lineStart = 0;
						this.curlyStack = [];
					}
					Scanner.prototype.saveState = function() {
						return {
							index: this.index,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart
						};
					};
					Scanner.prototype.restoreState = function(state) {
						this.index = state.index;
						this.lineNumber = state.lineNumber;
						this.lineStart = state.lineStart;
					};
					Scanner.prototype.eof = function() {
						return this.index >= this.length;
					};
					Scanner.prototype.throwUnexpectedToken = function(message) {
						if (message === void 0) message = messages_1.Messages.UnexpectedTokenIllegal;
						return this.errorHandler.throwError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
					};
					Scanner.prototype.tolerateUnexpectedToken = function(message) {
						if (message === void 0) message = messages_1.Messages.UnexpectedTokenIllegal;
						this.errorHandler.tolerateError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
					};
					Scanner.prototype.skipSingleLineComment = function(offset) {
						var comments = [];
						var start, loc;
						if (this.trackComment) {
							comments = [];
							start = this.index - offset;
							loc = {
								start: {
									line: this.lineNumber,
									column: this.index - this.lineStart - offset
								},
								end: {}
							};
						}
						while (!this.eof()) {
							var ch = this.source.charCodeAt(this.index);
							++this.index;
							if (character_1.Character.isLineTerminator(ch)) {
								if (this.trackComment) {
									loc.end = {
										line: this.lineNumber,
										column: this.index - this.lineStart - 1
									};
									var entry = {
										multiLine: false,
										slice: [start + offset, this.index - 1],
										range: [start, this.index - 1],
										loc
									};
									comments.push(entry);
								}
								if (ch === 13 && this.source.charCodeAt(this.index) === 10) ++this.index;
								++this.lineNumber;
								this.lineStart = this.index;
								return comments;
							}
						}
						if (this.trackComment) {
							loc.end = {
								line: this.lineNumber,
								column: this.index - this.lineStart
							};
							var entry = {
								multiLine: false,
								slice: [start + offset, this.index],
								range: [start, this.index],
								loc
							};
							comments.push(entry);
						}
						return comments;
					};
					Scanner.prototype.skipMultiLineComment = function() {
						var comments = [];
						var start, loc;
						if (this.trackComment) {
							comments = [];
							start = this.index - 2;
							loc = {
								start: {
									line: this.lineNumber,
									column: this.index - this.lineStart - 2
								},
								end: {}
							};
						}
						while (!this.eof()) {
							var ch = this.source.charCodeAt(this.index);
							if (character_1.Character.isLineTerminator(ch)) {
								if (ch === 13 && this.source.charCodeAt(this.index + 1) === 10) ++this.index;
								++this.lineNumber;
								++this.index;
								this.lineStart = this.index;
							} else if (ch === 42) {
								if (this.source.charCodeAt(this.index + 1) === 47) {
									this.index += 2;
									if (this.trackComment) {
										loc.end = {
											line: this.lineNumber,
											column: this.index - this.lineStart
										};
										var entry = {
											multiLine: true,
											slice: [start + 2, this.index - 2],
											range: [start, this.index],
											loc
										};
										comments.push(entry);
									}
									return comments;
								}
								++this.index;
							} else ++this.index;
						}
						if (this.trackComment) {
							loc.end = {
								line: this.lineNumber,
								column: this.index - this.lineStart
							};
							var entry = {
								multiLine: true,
								slice: [start + 2, this.index],
								range: [start, this.index],
								loc
							};
							comments.push(entry);
						}
						this.tolerateUnexpectedToken();
						return comments;
					};
					Scanner.prototype.scanComments = function() {
						var comments;
						if (this.trackComment) comments = [];
						var start = this.index === 0;
						while (!this.eof()) {
							var ch = this.source.charCodeAt(this.index);
							if (character_1.Character.isWhiteSpace(ch)) ++this.index;
							else if (character_1.Character.isLineTerminator(ch)) {
								++this.index;
								if (ch === 13 && this.source.charCodeAt(this.index) === 10) ++this.index;
								++this.lineNumber;
								this.lineStart = this.index;
								start = true;
							} else if (ch === 47) {
								ch = this.source.charCodeAt(this.index + 1);
								if (ch === 47) {
									this.index += 2;
									var comment = this.skipSingleLineComment(2);
									if (this.trackComment) comments = comments.concat(comment);
									start = true;
								} else if (ch === 42) {
									this.index += 2;
									var comment = this.skipMultiLineComment();
									if (this.trackComment) comments = comments.concat(comment);
								} else break;
							} else if (start && ch === 45) if (this.source.charCodeAt(this.index + 1) === 45 && this.source.charCodeAt(this.index + 2) === 62) {
								this.index += 3;
								var comment = this.skipSingleLineComment(3);
								if (this.trackComment) comments = comments.concat(comment);
							} else break;
							else if (ch === 60 && !this.isModule) if (this.source.slice(this.index + 1, this.index + 4) === "!--") {
								this.index += 4;
								var comment = this.skipSingleLineComment(4);
								if (this.trackComment) comments = comments.concat(comment);
							} else break;
							else break;
						}
						return comments;
					};
					Scanner.prototype.isFutureReservedWord = function(id) {
						switch (id) {
							case "enum":
							case "export":
							case "import":
							case "super": return true;
							default: return false;
						}
					};
					Scanner.prototype.isStrictModeReservedWord = function(id) {
						switch (id) {
							case "implements":
							case "interface":
							case "package":
							case "private":
							case "protected":
							case "public":
							case "static":
							case "yield":
							case "let": return true;
							default: return false;
						}
					};
					Scanner.prototype.isRestrictedWord = function(id) {
						return id === "eval" || id === "arguments";
					};
					Scanner.prototype.isKeyword = function(id) {
						switch (id.length) {
							case 2: return id === "if" || id === "in" || id === "do";
							case 3: return id === "var" || id === "for" || id === "new" || id === "try" || id === "let";
							case 4: return id === "this" || id === "else" || id === "case" || id === "void" || id === "with" || id === "enum";
							case 5: return id === "while" || id === "break" || id === "catch" || id === "throw" || id === "const" || id === "yield" || id === "class" || id === "super";
							case 6: return id === "return" || id === "typeof" || id === "delete" || id === "switch" || id === "export" || id === "import";
							case 7: return id === "default" || id === "finally" || id === "extends";
							case 8: return id === "function" || id === "continue" || id === "debugger";
							case 10: return id === "instanceof";
							default: return false;
						}
					};
					Scanner.prototype.codePointAt = function(i) {
						var cp = this.source.charCodeAt(i);
						if (cp >= 55296 && cp <= 56319) {
							var second = this.source.charCodeAt(i + 1);
							if (second >= 56320 && second <= 57343) cp = (cp - 55296) * 1024 + second - 56320 + 65536;
						}
						return cp;
					};
					Scanner.prototype.scanHexEscape = function(prefix) {
						var len = prefix === "u" ? 4 : 2;
						var code = 0;
						for (var i = 0; i < len; ++i) if (!this.eof() && character_1.Character.isHexDigit(this.source.charCodeAt(this.index))) code = code * 16 + hexValue(this.source[this.index++]);
						else return null;
						return String.fromCharCode(code);
					};
					Scanner.prototype.scanUnicodeCodePointEscape = function() {
						var ch = this.source[this.index];
						var code = 0;
						if (ch === "}") this.throwUnexpectedToken();
						while (!this.eof()) {
							ch = this.source[this.index++];
							if (!character_1.Character.isHexDigit(ch.charCodeAt(0))) break;
							code = code * 16 + hexValue(ch);
						}
						if (code > 1114111 || ch !== "}") this.throwUnexpectedToken();
						return character_1.Character.fromCodePoint(code);
					};
					Scanner.prototype.getIdentifier = function() {
						var start = this.index++;
						while (!this.eof()) {
							var ch = this.source.charCodeAt(this.index);
							if (ch === 92) {
								this.index = start;
								return this.getComplexIdentifier();
							} else if (ch >= 55296 && ch < 57343) {
								this.index = start;
								return this.getComplexIdentifier();
							}
							if (character_1.Character.isIdentifierPart(ch)) ++this.index;
							else break;
						}
						return this.source.slice(start, this.index);
					};
					Scanner.prototype.getComplexIdentifier = function() {
						var cp = this.codePointAt(this.index);
						var id = character_1.Character.fromCodePoint(cp);
						this.index += id.length;
						var ch;
						if (cp === 92) {
							if (this.source.charCodeAt(this.index) !== 117) this.throwUnexpectedToken();
							++this.index;
							if (this.source[this.index] === "{") {
								++this.index;
								ch = this.scanUnicodeCodePointEscape();
							} else {
								ch = this.scanHexEscape("u");
								if (ch === null || ch === "\\" || !character_1.Character.isIdentifierStart(ch.charCodeAt(0))) this.throwUnexpectedToken();
							}
							id = ch;
						}
						while (!this.eof()) {
							cp = this.codePointAt(this.index);
							if (!character_1.Character.isIdentifierPart(cp)) break;
							ch = character_1.Character.fromCodePoint(cp);
							id += ch;
							this.index += ch.length;
							if (cp === 92) {
								id = id.substr(0, id.length - 1);
								if (this.source.charCodeAt(this.index) !== 117) this.throwUnexpectedToken();
								++this.index;
								if (this.source[this.index] === "{") {
									++this.index;
									ch = this.scanUnicodeCodePointEscape();
								} else {
									ch = this.scanHexEscape("u");
									if (ch === null || ch === "\\" || !character_1.Character.isIdentifierPart(ch.charCodeAt(0))) this.throwUnexpectedToken();
								}
								id += ch;
							}
						}
						return id;
					};
					Scanner.prototype.octalToDecimal = function(ch) {
						var octal = ch !== "0";
						var code = octalValue(ch);
						if (!this.eof() && character_1.Character.isOctalDigit(this.source.charCodeAt(this.index))) {
							octal = true;
							code = code * 8 + octalValue(this.source[this.index++]);
							if ("0123".indexOf(ch) >= 0 && !this.eof() && character_1.Character.isOctalDigit(this.source.charCodeAt(this.index))) code = code * 8 + octalValue(this.source[this.index++]);
						}
						return {
							code,
							octal
						};
					};
					Scanner.prototype.scanIdentifier = function() {
						var type;
						var start = this.index;
						var id = this.source.charCodeAt(start) === 92 ? this.getComplexIdentifier() : this.getIdentifier();
						if (id.length === 1) type = 3;
						else if (this.isKeyword(id)) type = 4;
						else if (id === "null") type = 5;
						else if (id === "true" || id === "false") type = 1;
						else type = 3;
						if (type !== 3 && start + id.length !== this.index) {
							var restore = this.index;
							this.index = start;
							this.tolerateUnexpectedToken(messages_1.Messages.InvalidEscapedReservedWord);
							this.index = restore;
						}
						return {
							type,
							value: id,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanPunctuator = function() {
						var start = this.index;
						var str = this.source[this.index];
						switch (str) {
							case "(":
							case "{":
								if (str === "{") this.curlyStack.push("{");
								++this.index;
								break;
							case ".":
								++this.index;
								if (this.source[this.index] === "." && this.source[this.index + 1] === ".") {
									this.index += 2;
									str = "...";
								}
								break;
							case "}":
								++this.index;
								this.curlyStack.pop();
								break;
							case ")":
							case ";":
							case ",":
							case "[":
							case "]":
							case ":":
							case "?":
							case "~":
								++this.index;
								break;
							default:
								str = this.source.substr(this.index, 4);
								if (str === ">>>=") this.index += 4;
								else {
									str = str.substr(0, 3);
									if (str === "===" || str === "!==" || str === ">>>" || str === "<<=" || str === ">>=" || str === "**=") this.index += 3;
									else {
										str = str.substr(0, 2);
										if (str === "&&" || str === "||" || str === "==" || str === "!=" || str === "+=" || str === "-=" || str === "*=" || str === "/=" || str === "++" || str === "--" || str === "<<" || str === ">>" || str === "&=" || str === "|=" || str === "^=" || str === "%=" || str === "<=" || str === ">=" || str === "=>" || str === "**") this.index += 2;
										else {
											str = this.source[this.index];
											if ("<>=!+-*%&|^/".indexOf(str) >= 0) ++this.index;
										}
									}
								}
						}
						if (this.index === start) this.throwUnexpectedToken();
						return {
							type: 7,
							value: str,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanHexLiteral = function(start) {
						var num = "";
						while (!this.eof()) {
							if (!character_1.Character.isHexDigit(this.source.charCodeAt(this.index))) break;
							num += this.source[this.index++];
						}
						if (num.length === 0) this.throwUnexpectedToken();
						if (character_1.Character.isIdentifierStart(this.source.charCodeAt(this.index))) this.throwUnexpectedToken();
						return {
							type: 6,
							value: parseInt("0x" + num, 16),
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanBinaryLiteral = function(start) {
						var num = "";
						var ch;
						while (!this.eof()) {
							ch = this.source[this.index];
							if (ch !== "0" && ch !== "1") break;
							num += this.source[this.index++];
						}
						if (num.length === 0) this.throwUnexpectedToken();
						if (!this.eof()) {
							ch = this.source.charCodeAt(this.index);
							/* istanbul ignore else */
							if (character_1.Character.isIdentifierStart(ch) || character_1.Character.isDecimalDigit(ch)) this.throwUnexpectedToken();
						}
						return {
							type: 6,
							value: parseInt(num, 2),
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanOctalLiteral = function(prefix, start) {
						var num = "";
						var octal = false;
						if (character_1.Character.isOctalDigit(prefix.charCodeAt(0))) {
							octal = true;
							num = "0" + this.source[this.index++];
						} else ++this.index;
						while (!this.eof()) {
							if (!character_1.Character.isOctalDigit(this.source.charCodeAt(this.index))) break;
							num += this.source[this.index++];
						}
						if (!octal && num.length === 0) this.throwUnexpectedToken();
						if (character_1.Character.isIdentifierStart(this.source.charCodeAt(this.index)) || character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) this.throwUnexpectedToken();
						return {
							type: 6,
							value: parseInt(num, 8),
							octal,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.isImplicitOctalLiteral = function() {
						for (var i = this.index + 1; i < this.length; ++i) {
							var ch = this.source[i];
							if (ch === "8" || ch === "9") return false;
							if (!character_1.Character.isOctalDigit(ch.charCodeAt(0))) return true;
						}
						return true;
					};
					Scanner.prototype.scanNumericLiteral = function() {
						var start = this.index;
						var ch = this.source[start];
						assert_1.assert(character_1.Character.isDecimalDigit(ch.charCodeAt(0)) || ch === ".", "Numeric literal must start with a decimal digit or a decimal point");
						var num = "";
						if (ch !== ".") {
							num = this.source[this.index++];
							ch = this.source[this.index];
							if (num === "0") {
								if (ch === "x" || ch === "X") {
									++this.index;
									return this.scanHexLiteral(start);
								}
								if (ch === "b" || ch === "B") {
									++this.index;
									return this.scanBinaryLiteral(start);
								}
								if (ch === "o" || ch === "O") return this.scanOctalLiteral(ch, start);
								if (ch && character_1.Character.isOctalDigit(ch.charCodeAt(0))) {
									if (this.isImplicitOctalLiteral()) return this.scanOctalLiteral(ch, start);
								}
							}
							while (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) num += this.source[this.index++];
							ch = this.source[this.index];
						}
						if (ch === ".") {
							num += this.source[this.index++];
							while (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) num += this.source[this.index++];
							ch = this.source[this.index];
						}
						if (ch === "e" || ch === "E") {
							num += this.source[this.index++];
							ch = this.source[this.index];
							if (ch === "+" || ch === "-") num += this.source[this.index++];
							if (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) while (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) num += this.source[this.index++];
							else this.throwUnexpectedToken();
						}
						if (character_1.Character.isIdentifierStart(this.source.charCodeAt(this.index))) this.throwUnexpectedToken();
						return {
							type: 6,
							value: parseFloat(num),
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanStringLiteral = function() {
						var start = this.index;
						var quote = this.source[start];
						assert_1.assert(quote === "'" || quote === "\"", "String literal must starts with a quote");
						++this.index;
						var octal = false;
						var str = "";
						while (!this.eof()) {
							var ch = this.source[this.index++];
							if (ch === quote) {
								quote = "";
								break;
							} else if (ch === "\\") {
								ch = this.source[this.index++];
								if (!ch || !character_1.Character.isLineTerminator(ch.charCodeAt(0))) switch (ch) {
									case "u":
										if (this.source[this.index] === "{") {
											++this.index;
											str += this.scanUnicodeCodePointEscape();
										} else {
											var unescaped_1 = this.scanHexEscape(ch);
											if (unescaped_1 === null) this.throwUnexpectedToken();
											str += unescaped_1;
										}
										break;
									case "x":
										var unescaped = this.scanHexEscape(ch);
										if (unescaped === null) this.throwUnexpectedToken(messages_1.Messages.InvalidHexEscapeSequence);
										str += unescaped;
										break;
									case "n":
										str += "\n";
										break;
									case "r":
										str += "\r";
										break;
									case "t":
										str += "	";
										break;
									case "b":
										str += "\b";
										break;
									case "f":
										str += "\f";
										break;
									case "v":
										str += "\v";
										break;
									case "8":
									case "9":
										str += ch;
										this.tolerateUnexpectedToken();
										break;
									default:
										if (ch && character_1.Character.isOctalDigit(ch.charCodeAt(0))) {
											var octToDec = this.octalToDecimal(ch);
											octal = octToDec.octal || octal;
											str += String.fromCharCode(octToDec.code);
										} else str += ch;
										break;
								}
								else {
									++this.lineNumber;
									if (ch === "\r" && this.source[this.index] === "\n") ++this.index;
									this.lineStart = this.index;
								}
							} else if (character_1.Character.isLineTerminator(ch.charCodeAt(0))) break;
							else str += ch;
						}
						if (quote !== "") {
							this.index = start;
							this.throwUnexpectedToken();
						}
						return {
							type: 8,
							value: str,
							octal,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanTemplate = function() {
						var cooked = "";
						var terminated = false;
						var start = this.index;
						var head = this.source[start] === "`";
						var tail = false;
						var rawOffset = 2;
						++this.index;
						while (!this.eof()) {
							var ch = this.source[this.index++];
							if (ch === "`") {
								rawOffset = 1;
								tail = true;
								terminated = true;
								break;
							} else if (ch === "$") {
								if (this.source[this.index] === "{") {
									this.curlyStack.push("${");
									++this.index;
									terminated = true;
									break;
								}
								cooked += ch;
							} else if (ch === "\\") {
								ch = this.source[this.index++];
								if (!character_1.Character.isLineTerminator(ch.charCodeAt(0))) switch (ch) {
									case "n":
										cooked += "\n";
										break;
									case "r":
										cooked += "\r";
										break;
									case "t":
										cooked += "	";
										break;
									case "u":
										if (this.source[this.index] === "{") {
											++this.index;
											cooked += this.scanUnicodeCodePointEscape();
										} else {
											var restore = this.index;
											var unescaped_2 = this.scanHexEscape(ch);
											if (unescaped_2 !== null) cooked += unescaped_2;
											else {
												this.index = restore;
												cooked += ch;
											}
										}
										break;
									case "x":
										var unescaped = this.scanHexEscape(ch);
										if (unescaped === null) this.throwUnexpectedToken(messages_1.Messages.InvalidHexEscapeSequence);
										cooked += unescaped;
										break;
									case "b":
										cooked += "\b";
										break;
									case "f":
										cooked += "\f";
										break;
									case "v":
										cooked += "\v";
										break;
									default:
										if (ch === "0") {
											if (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) this.throwUnexpectedToken(messages_1.Messages.TemplateOctalLiteral);
											cooked += "\0";
										} else if (character_1.Character.isOctalDigit(ch.charCodeAt(0))) this.throwUnexpectedToken(messages_1.Messages.TemplateOctalLiteral);
										else cooked += ch;
										break;
								}
								else {
									++this.lineNumber;
									if (ch === "\r" && this.source[this.index] === "\n") ++this.index;
									this.lineStart = this.index;
								}
							} else if (character_1.Character.isLineTerminator(ch.charCodeAt(0))) {
								++this.lineNumber;
								if (ch === "\r" && this.source[this.index] === "\n") ++this.index;
								this.lineStart = this.index;
								cooked += "\n";
							} else cooked += ch;
						}
						if (!terminated) this.throwUnexpectedToken();
						if (!head) this.curlyStack.pop();
						return {
							type: 10,
							value: this.source.slice(start + 1, this.index - rawOffset),
							cooked,
							head,
							tail,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.testRegExp = function(pattern, flags) {
						var astralSubstitute = "￿";
						var tmp = pattern;
						var self = this;
						if (flags.indexOf("u") >= 0) tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([a-fA-F0-9]{4})/g, function($0, $1, $2) {
							var codePoint = parseInt($1 || $2, 16);
							if (codePoint > 1114111) self.throwUnexpectedToken(messages_1.Messages.InvalidRegExp);
							if (codePoint <= 65535) return String.fromCharCode(codePoint);
							return astralSubstitute;
						}).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, astralSubstitute);
						try {
							RegExp(tmp);
						} catch (e) {
							this.throwUnexpectedToken(messages_1.Messages.InvalidRegExp);
						}
						try {
							return new RegExp(pattern, flags);
						} catch (exception) {
							/* istanbul ignore next */
							return null;
						}
					};
					Scanner.prototype.scanRegExpBody = function() {
						var ch = this.source[this.index];
						assert_1.assert(ch === "/", "Regular expression literal must start with a slash");
						var str = this.source[this.index++];
						var classMarker = false;
						var terminated = false;
						while (!this.eof()) {
							ch = this.source[this.index++];
							str += ch;
							if (ch === "\\") {
								ch = this.source[this.index++];
								if (character_1.Character.isLineTerminator(ch.charCodeAt(0))) this.throwUnexpectedToken(messages_1.Messages.UnterminatedRegExp);
								str += ch;
							} else if (character_1.Character.isLineTerminator(ch.charCodeAt(0))) this.throwUnexpectedToken(messages_1.Messages.UnterminatedRegExp);
							else if (classMarker) {
								if (ch === "]") classMarker = false;
							} else if (ch === "/") {
								terminated = true;
								break;
							} else if (ch === "[") classMarker = true;
						}
						if (!terminated) this.throwUnexpectedToken(messages_1.Messages.UnterminatedRegExp);
						return str.substr(1, str.length - 2);
					};
					Scanner.prototype.scanRegExpFlags = function() {
						var str = "";
						var flags = "";
						while (!this.eof()) {
							var ch = this.source[this.index];
							if (!character_1.Character.isIdentifierPart(ch.charCodeAt(0))) break;
							++this.index;
							if (ch === "\\" && !this.eof()) {
								ch = this.source[this.index];
								if (ch === "u") {
									++this.index;
									var restore = this.index;
									var char = this.scanHexEscape("u");
									if (char !== null) {
										flags += char;
										for (str += "\\u"; restore < this.index; ++restore) str += this.source[restore];
									} else {
										this.index = restore;
										flags += "u";
										str += "\\u";
									}
									this.tolerateUnexpectedToken();
								} else {
									str += "\\";
									this.tolerateUnexpectedToken();
								}
							} else {
								flags += ch;
								str += ch;
							}
						}
						return flags;
					};
					Scanner.prototype.scanRegExp = function() {
						var start = this.index;
						var pattern = this.scanRegExpBody();
						var flags = this.scanRegExpFlags();
						return {
							type: 9,
							value: "",
							pattern,
							flags,
							regex: this.testRegExp(pattern, flags),
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.lex = function() {
						if (this.eof()) return {
							type: 2,
							value: "",
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start: this.index,
							end: this.index
						};
						var cp = this.source.charCodeAt(this.index);
						if (character_1.Character.isIdentifierStart(cp)) return this.scanIdentifier();
						if (cp === 40 || cp === 41 || cp === 59) return this.scanPunctuator();
						if (cp === 39 || cp === 34) return this.scanStringLiteral();
						if (cp === 46) {
							if (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index + 1))) return this.scanNumericLiteral();
							return this.scanPunctuator();
						}
						if (character_1.Character.isDecimalDigit(cp)) return this.scanNumericLiteral();
						if (cp === 96 || cp === 125 && this.curlyStack[this.curlyStack.length - 1] === "${") return this.scanTemplate();
						if (cp >= 55296 && cp < 57343) {
							if (character_1.Character.isIdentifierStart(this.codePointAt(this.index))) return this.scanIdentifier();
						}
						return this.scanPunctuator();
					};
					return Scanner;
				}();
			},
			function(module$15, exports$14) {
				"use strict";
				Object.defineProperty(exports$14, "__esModule", { value: true });
				exports$14.TokenName = {};
				exports$14.TokenName[1] = "Boolean";
				exports$14.TokenName[2] = "<end>";
				exports$14.TokenName[3] = "Identifier";
				exports$14.TokenName[4] = "Keyword";
				exports$14.TokenName[5] = "Null";
				exports$14.TokenName[6] = "Numeric";
				exports$14.TokenName[7] = "Punctuator";
				exports$14.TokenName[8] = "String";
				exports$14.TokenName[9] = "RegularExpression";
				exports$14.TokenName[10] = "Template";
			},
			function(module$16, exports$15) {
				"use strict";
				Object.defineProperty(exports$15, "__esModule", { value: true });
				exports$15.XHTMLEntities = {
					quot: "\"",
					amp: "&",
					apos: "'",
					gt: ">",
					nbsp: "\xA0",
					iexcl: "¡",
					cent: "¢",
					pound: "£",
					curren: "¤",
					yen: "¥",
					brvbar: "¦",
					sect: "§",
					uml: "¨",
					copy: "©",
					ordf: "ª",
					laquo: "«",
					not: "¬",
					shy: "­",
					reg: "®",
					macr: "¯",
					deg: "°",
					plusmn: "±",
					sup2: "²",
					sup3: "³",
					acute: "´",
					micro: "µ",
					para: "¶",
					middot: "·",
					cedil: "¸",
					sup1: "¹",
					ordm: "º",
					raquo: "»",
					frac14: "¼",
					frac12: "½",
					frac34: "¾",
					iquest: "¿",
					Agrave: "À",
					Aacute: "Á",
					Acirc: "Â",
					Atilde: "Ã",
					Auml: "Ä",
					Aring: "Å",
					AElig: "Æ",
					Ccedil: "Ç",
					Egrave: "È",
					Eacute: "É",
					Ecirc: "Ê",
					Euml: "Ë",
					Igrave: "Ì",
					Iacute: "Í",
					Icirc: "Î",
					Iuml: "Ï",
					ETH: "Ð",
					Ntilde: "Ñ",
					Ograve: "Ò",
					Oacute: "Ó",
					Ocirc: "Ô",
					Otilde: "Õ",
					Ouml: "Ö",
					times: "×",
					Oslash: "Ø",
					Ugrave: "Ù",
					Uacute: "Ú",
					Ucirc: "Û",
					Uuml: "Ü",
					Yacute: "Ý",
					THORN: "Þ",
					szlig: "ß",
					agrave: "à",
					aacute: "á",
					acirc: "â",
					atilde: "ã",
					auml: "ä",
					aring: "å",
					aelig: "æ",
					ccedil: "ç",
					egrave: "è",
					eacute: "é",
					ecirc: "ê",
					euml: "ë",
					igrave: "ì",
					iacute: "í",
					icirc: "î",
					iuml: "ï",
					eth: "ð",
					ntilde: "ñ",
					ograve: "ò",
					oacute: "ó",
					ocirc: "ô",
					otilde: "õ",
					ouml: "ö",
					divide: "÷",
					oslash: "ø",
					ugrave: "ù",
					uacute: "ú",
					ucirc: "û",
					uuml: "ü",
					yacute: "ý",
					thorn: "þ",
					yuml: "ÿ",
					OElig: "Œ",
					oelig: "œ",
					Scaron: "Š",
					scaron: "š",
					Yuml: "Ÿ",
					fnof: "ƒ",
					circ: "ˆ",
					tilde: "˜",
					Alpha: "Α",
					Beta: "Β",
					Gamma: "Γ",
					Delta: "Δ",
					Epsilon: "Ε",
					Zeta: "Ζ",
					Eta: "Η",
					Theta: "Θ",
					Iota: "Ι",
					Kappa: "Κ",
					Lambda: "Λ",
					Mu: "Μ",
					Nu: "Ν",
					Xi: "Ξ",
					Omicron: "Ο",
					Pi: "Π",
					Rho: "Ρ",
					Sigma: "Σ",
					Tau: "Τ",
					Upsilon: "Υ",
					Phi: "Φ",
					Chi: "Χ",
					Psi: "Ψ",
					Omega: "Ω",
					alpha: "α",
					beta: "β",
					gamma: "γ",
					delta: "δ",
					epsilon: "ε",
					zeta: "ζ",
					eta: "η",
					theta: "θ",
					iota: "ι",
					kappa: "κ",
					lambda: "λ",
					mu: "μ",
					nu: "ν",
					xi: "ξ",
					omicron: "ο",
					pi: "π",
					rho: "ρ",
					sigmaf: "ς",
					sigma: "σ",
					tau: "τ",
					upsilon: "υ",
					phi: "φ",
					chi: "χ",
					psi: "ψ",
					omega: "ω",
					thetasym: "ϑ",
					upsih: "ϒ",
					piv: "ϖ",
					ensp: " ",
					emsp: " ",
					thinsp: " ",
					zwnj: "‌",
					zwj: "‍",
					lrm: "‎",
					rlm: "‏",
					ndash: "–",
					mdash: "—",
					lsquo: "‘",
					rsquo: "’",
					sbquo: "‚",
					ldquo: "“",
					rdquo: "”",
					bdquo: "„",
					dagger: "†",
					Dagger: "‡",
					bull: "•",
					hellip: "…",
					permil: "‰",
					prime: "′",
					Prime: "″",
					lsaquo: "‹",
					rsaquo: "›",
					oline: "‾",
					frasl: "⁄",
					euro: "€",
					image: "ℑ",
					weierp: "℘",
					real: "ℜ",
					trade: "™",
					alefsym: "ℵ",
					larr: "←",
					uarr: "↑",
					rarr: "→",
					darr: "↓",
					harr: "↔",
					crarr: "↵",
					lArr: "⇐",
					uArr: "⇑",
					rArr: "⇒",
					dArr: "⇓",
					hArr: "⇔",
					forall: "∀",
					part: "∂",
					exist: "∃",
					empty: "∅",
					nabla: "∇",
					isin: "∈",
					notin: "∉",
					ni: "∋",
					prod: "∏",
					sum: "∑",
					minus: "−",
					lowast: "∗",
					radic: "√",
					prop: "∝",
					infin: "∞",
					ang: "∠",
					and: "∧",
					or: "∨",
					cap: "∩",
					cup: "∪",
					int: "∫",
					there4: "∴",
					sim: "∼",
					cong: "≅",
					asymp: "≈",
					ne: "≠",
					equiv: "≡",
					le: "≤",
					ge: "≥",
					sub: "⊂",
					sup: "⊃",
					nsub: "⊄",
					sube: "⊆",
					supe: "⊇",
					oplus: "⊕",
					otimes: "⊗",
					perp: "⊥",
					sdot: "⋅",
					lceil: "⌈",
					rceil: "⌉",
					lfloor: "⌊",
					rfloor: "⌋",
					loz: "◊",
					spades: "♠",
					clubs: "♣",
					hearts: "♥",
					diams: "♦",
					lang: "⟨",
					rang: "⟩"
				};
			},
			function(module$17, exports$16, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$16, "__esModule", { value: true });
				var error_handler_1 = __webpack_require__(10);
				var scanner_1 = __webpack_require__(12);
				var token_1 = __webpack_require__(13);
				var Reader = function() {
					function Reader() {
						this.values = [];
						this.curly = this.paren = -1;
					}
					Reader.prototype.beforeFunctionExpression = function(t) {
						return [
							"(",
							"{",
							"[",
							"in",
							"typeof",
							"instanceof",
							"new",
							"return",
							"case",
							"delete",
							"throw",
							"void",
							"=",
							"+=",
							"-=",
							"*=",
							"**=",
							"/=",
							"%=",
							"<<=",
							">>=",
							">>>=",
							"&=",
							"|=",
							"^=",
							",",
							"+",
							"-",
							"*",
							"**",
							"/",
							"%",
							"++",
							"--",
							"<<",
							">>",
							">>>",
							"&",
							"|",
							"^",
							"!",
							"~",
							"&&",
							"||",
							"?",
							":",
							"===",
							"==",
							">=",
							"<=",
							"<",
							">",
							"!=",
							"!=="
						].indexOf(t) >= 0;
					};
					Reader.prototype.isRegexStart = function() {
						var previous = this.values[this.values.length - 1];
						var regex = previous !== null;
						switch (previous) {
							case "this":
							case "]":
								regex = false;
								break;
							case ")":
								var keyword = this.values[this.paren - 1];
								regex = keyword === "if" || keyword === "while" || keyword === "for" || keyword === "with";
								break;
							case "}":
								regex = false;
								if (this.values[this.curly - 3] === "function") {
									var check = this.values[this.curly - 4];
									regex = check ? !this.beforeFunctionExpression(check) : false;
								} else if (this.values[this.curly - 4] === "function") {
									var check = this.values[this.curly - 5];
									regex = check ? !this.beforeFunctionExpression(check) : true;
								}
								break;
							default: break;
						}
						return regex;
					};
					Reader.prototype.push = function(token) {
						if (token.type === 7 || token.type === 4) {
							if (token.value === "{") this.curly = this.values.length;
							else if (token.value === "(") this.paren = this.values.length;
							this.values.push(token.value);
						} else this.values.push(null);
					};
					return Reader;
				}();
				exports$16.Tokenizer = function() {
					function Tokenizer(code, config) {
						this.errorHandler = new error_handler_1.ErrorHandler();
						this.errorHandler.tolerant = config ? typeof config.tolerant === "boolean" && config.tolerant : false;
						this.scanner = new scanner_1.Scanner(code, this.errorHandler);
						this.scanner.trackComment = config ? typeof config.comment === "boolean" && config.comment : false;
						this.trackRange = config ? typeof config.range === "boolean" && config.range : false;
						this.trackLoc = config ? typeof config.loc === "boolean" && config.loc : false;
						this.buffer = [];
						this.reader = new Reader();
					}
					Tokenizer.prototype.errors = function() {
						return this.errorHandler.errors;
					};
					Tokenizer.prototype.getNextToken = function() {
						if (this.buffer.length === 0) {
							var comments = this.scanner.scanComments();
							if (this.scanner.trackComment) for (var i = 0; i < comments.length; ++i) {
								var e = comments[i];
								var value = this.scanner.source.slice(e.slice[0], e.slice[1]);
								var comment = {
									type: e.multiLine ? "BlockComment" : "LineComment",
									value
								};
								if (this.trackRange) comment.range = e.range;
								if (this.trackLoc) comment.loc = e.loc;
								this.buffer.push(comment);
							}
							if (!this.scanner.eof()) {
								var loc = void 0;
								if (this.trackLoc) loc = {
									start: {
										line: this.scanner.lineNumber,
										column: this.scanner.index - this.scanner.lineStart
									},
									end: {}
								};
								var token = this.scanner.source[this.scanner.index] === "/" && this.reader.isRegexStart() ? this.scanner.scanRegExp() : this.scanner.lex();
								this.reader.push(token);
								var entry = {
									type: token_1.TokenName[token.type],
									value: this.scanner.source.slice(token.start, token.end)
								};
								if (this.trackRange) entry.range = [token.start, token.end];
								if (this.trackLoc) {
									loc.end = {
										line: this.scanner.lineNumber,
										column: this.scanner.index - this.scanner.lineStart
									};
									entry.loc = loc;
								}
								if (token.type === 9) entry.regex = {
									pattern: token.pattern,
									flags: token.flags
								};
								this.buffer.push(entry);
							}
						}
						return this.buffer.shift();
					};
					return Tokenizer;
				}();
			}
		]);
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/type/js/function.js
var require_function = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var esprima;
	try {
		esprima = require_esprima();
	} catch (_) {
		if (typeof window !== "undefined") esprima = window.esprima;
	}
	var Type = require_type();
	function resolveJavascriptFunction(data) {
		if (data === null) return false;
		try {
			var source = "(" + data + ")", ast = esprima.parse(source, { range: true });
			if (ast.type !== "Program" || ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement" || ast.body[0].expression.type !== "ArrowFunctionExpression" && ast.body[0].expression.type !== "FunctionExpression") return false;
			return true;
		} catch (err) {
			return false;
		}
	}
	function constructJavascriptFunction(data) {
		var source = "(" + data + ")", ast = esprima.parse(source, { range: true }), params = [], body;
		if (ast.type !== "Program" || ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement" || ast.body[0].expression.type !== "ArrowFunctionExpression" && ast.body[0].expression.type !== "FunctionExpression") throw new Error("Failed to resolve function");
		ast.body[0].expression.params.forEach(function(param) {
			params.push(param.name);
		});
		body = ast.body[0].expression.body.range;
		if (ast.body[0].expression.body.type === "BlockStatement") return new Function(params, source.slice(body[0] + 1, body[1] - 1));
		return new Function(params, "return " + source.slice(body[0], body[1]));
	}
	function representJavascriptFunction(object) {
		return object.toString();
	}
	function isFunction(object) {
		return Object.prototype.toString.call(object) === "[object Function]";
	}
	module.exports = new Type("tag:yaml.org,2002:js/function", {
		kind: "scalar",
		resolve: resolveJavascriptFunction,
		construct: constructJavascriptFunction,
		predicate: isFunction,
		represent: representJavascriptFunction
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/schema/default_full.js
var require_default_full = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Schema = require_schema();
	module.exports = Schema.DEFAULT = new Schema({
		include: [require_default_safe()],
		explicit: [
			require_undefined(),
			require_regexp(),
			require_function()
		]
	});
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/loader.js
var require_loader = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common();
	var YAMLException = require_exception();
	var Mark = require_mark();
	var DEFAULT_SAFE_SCHEMA = require_default_safe();
	var DEFAULT_FULL_SCHEMA = require_default_full();
	var _hasOwnProperty = Object.prototype.hasOwnProperty;
	var CONTEXT_FLOW_IN = 1;
	var CONTEXT_FLOW_OUT = 2;
	var CONTEXT_BLOCK_IN = 3;
	var CONTEXT_BLOCK_OUT = 4;
	var CHOMPING_CLIP = 1;
	var CHOMPING_STRIP = 2;
	var CHOMPING_KEEP = 3;
	var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
	var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
	var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
	var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
	var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
	function _class(obj) {
		return Object.prototype.toString.call(obj);
	}
	function is_EOL(c) {
		return c === 10 || c === 13;
	}
	function is_WHITE_SPACE(c) {
		return c === 9 || c === 32;
	}
	function is_WS_OR_EOL(c) {
		return c === 9 || c === 32 || c === 10 || c === 13;
	}
	function is_FLOW_INDICATOR(c) {
		return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
	}
	function fromHexCode(c) {
		var lc;
		if (48 <= c && c <= 57) return c - 48;
		lc = c | 32;
		if (97 <= lc && lc <= 102) return lc - 97 + 10;
		return -1;
	}
	function escapedHexLen(c) {
		if (c === 120) return 2;
		if (c === 117) return 4;
		if (c === 85) return 8;
		return 0;
	}
	function fromDecimalCode(c) {
		if (48 <= c && c <= 57) return c - 48;
		return -1;
	}
	function simpleEscapeSequence(c) {
		return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? "\"" : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
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
	var simpleEscapeCheck = new Array(256);
	var simpleEscapeMap = new Array(256);
	for (var i = 0; i < 256; i++) {
		simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
		simpleEscapeMap[i] = simpleEscapeSequence(i);
	}
	function State(input, options) {
		this.input = input;
		this.filename = options["filename"] || null;
		this.schema = options["schema"] || DEFAULT_FULL_SCHEMA;
		this.onWarning = options["onWarning"] || null;
		this.legacy = options["legacy"] || false;
		this.json = options["json"] || false;
		this.listener = options["listener"] || null;
		this.implicitTypes = this.schema.compiledImplicit;
		this.typeMap = this.schema.compiledTypeMap;
		this.length = input.length;
		this.position = 0;
		this.line = 0;
		this.lineStart = 0;
		this.lineIndent = 0;
		this.documents = [];
	}
	function generateError(state, message) {
		return new YAMLException(message, new Mark(state.filename, state.input, state.position, state.line, state.position - state.lineStart));
	}
	function throwError(state, message) {
		throw generateError(state, message);
	}
	function throwWarning(state, message) {
		if (state.onWarning) state.onWarning.call(null, generateError(state, message));
	}
	var directiveHandlers = {
		YAML: function handleYamlDirective(state, name, args) {
			var match, major, minor;
			if (state.version !== null) throwError(state, "duplication of %YAML directive");
			if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
			match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
			if (match === null) throwError(state, "ill-formed argument of the YAML directive");
			major = parseInt(match[1], 10);
			minor = parseInt(match[2], 10);
			if (major !== 1) throwError(state, "unacceptable YAML version of the document");
			state.version = args[0];
			state.checkLineBreaks = minor < 2;
			if (minor !== 1 && minor !== 2) throwWarning(state, "unsupported YAML version of the document");
		},
		TAG: function handleTagDirective(state, name, args) {
			var handle, prefix;
			if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
			handle = args[0];
			prefix = args[1];
			if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
			if (_hasOwnProperty.call(state.tagMap, handle)) throwError(state, "there is a previously declared suffix for \"" + handle + "\" tag handle");
			if (!PATTERN_TAG_URI.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
			state.tagMap[handle] = prefix;
		}
	};
	function captureSegment(state, start, end, checkJson) {
		var _position, _length, _character, _result;
		if (start < end) {
			_result = state.input.slice(start, end);
			if (checkJson) for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
				_character = _result.charCodeAt(_position);
				if (!(_character === 9 || 32 <= _character && _character <= 1114111)) throwError(state, "expected valid JSON character");
			}
			else if (PATTERN_NON_PRINTABLE.test(_result)) throwError(state, "the stream contains non-printable characters");
			state.result += _result;
		}
	}
	function mergeMappings(state, destination, source, overridableKeys) {
		var sourceKeys, key, index, quantity;
		if (!common.isObject(source)) throwError(state, "cannot merge mappings; the provided source object is unacceptable");
		sourceKeys = Object.keys(source);
		for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
			key = sourceKeys[index];
			if (!_hasOwnProperty.call(destination, key)) {
				setProperty(destination, key, source[key]);
				overridableKeys[key] = true;
			}
		}
	}
	function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
		var index, quantity;
		if (Array.isArray(keyNode)) {
			keyNode = Array.prototype.slice.call(keyNode);
			for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
				if (Array.isArray(keyNode[index])) throwError(state, "nested arrays are not supported inside keys");
				if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") keyNode[index] = "[object Object]";
			}
		}
		if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") keyNode = "[object Object]";
		keyNode = String(keyNode);
		if (_result === null) _result = {};
		if (keyTag === "tag:yaml.org,2002:merge") if (Array.isArray(valueNode)) for (index = 0, quantity = valueNode.length; index < quantity; index += 1) mergeMappings(state, _result, valueNode[index], overridableKeys);
		else mergeMappings(state, _result, valueNode, overridableKeys);
		else {
			if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
				state.line = startLine || state.line;
				state.position = startPos || state.position;
				throwError(state, "duplicated mapping key");
			}
			setProperty(_result, keyNode, valueNode);
			delete overridableKeys[keyNode];
		}
		return _result;
	}
	function readLineBreak(state) {
		var ch = state.input.charCodeAt(state.position);
		if (ch === 10) state.position++;
		else if (ch === 13) {
			state.position++;
			if (state.input.charCodeAt(state.position) === 10) state.position++;
		} else throwError(state, "a line break is expected");
		state.line += 1;
		state.lineStart = state.position;
	}
	function skipSeparationSpace(state, allowComments, checkIndent) {
		var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			while (is_WHITE_SPACE(ch)) ch = state.input.charCodeAt(++state.position);
			if (allowComments && ch === 35) do
				ch = state.input.charCodeAt(++state.position);
			while (ch !== 10 && ch !== 13 && ch !== 0);
			if (is_EOL(ch)) {
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
		var _position = state.position, ch = state.input.charCodeAt(_position);
		if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
			_position += 3;
			ch = state.input.charCodeAt(_position);
			if (ch === 0 || is_WS_OR_EOL(ch)) return true;
		}
		return false;
	}
	function writeFoldedLines(state, count) {
		if (count === 1) state.result += " ";
		else if (count > 1) state.result += common.repeat("\n", count - 1);
	}
	function readPlainScalar(state, nodeIndent, withinFlowCollection) {
		var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch = state.input.charCodeAt(state.position);
		if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) return false;
		if (ch === 63 || ch === 45) {
			following = state.input.charCodeAt(state.position + 1);
			if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) return false;
		}
		state.kind = "scalar";
		state.result = "";
		captureStart = captureEnd = state.position;
		hasPendingContent = false;
		while (ch !== 0) {
			if (ch === 58) {
				following = state.input.charCodeAt(state.position + 1);
				if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) break;
			} else if (ch === 35) {
				preceding = state.input.charCodeAt(state.position - 1);
				if (is_WS_OR_EOL(preceding)) break;
			} else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) break;
			else if (is_EOL(ch)) {
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
			if (!is_WHITE_SPACE(ch)) captureEnd = state.position + 1;
			ch = state.input.charCodeAt(++state.position);
		}
		captureSegment(state, captureStart, captureEnd, false);
		if (state.result) return true;
		state.kind = _kind;
		state.result = _result;
		return false;
	}
	function readSingleQuotedScalar(state, nodeIndent) {
		var ch = state.input.charCodeAt(state.position), captureStart, captureEnd;
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
		} else if (is_EOL(ch)) {
			captureSegment(state, captureStart, captureEnd, true);
			writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
			captureStart = captureEnd = state.position;
		} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
		else {
			state.position++;
			captureEnd = state.position;
		}
		throwError(state, "unexpected end of the stream within a single quoted scalar");
	}
	function readDoubleQuotedScalar(state, nodeIndent) {
		var captureStart, captureEnd, hexLength, hexResult, tmp, ch = state.input.charCodeAt(state.position);
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
			if (is_EOL(ch)) skipSeparationSpace(state, false, nodeIndent);
			else if (ch < 256 && simpleEscapeCheck[ch]) {
				state.result += simpleEscapeMap[ch];
				state.position++;
			} else if ((tmp = escapedHexLen(ch)) > 0) {
				hexLength = tmp;
				hexResult = 0;
				for (; hexLength > 0; hexLength--) {
					ch = state.input.charCodeAt(++state.position);
					if ((tmp = fromHexCode(ch)) >= 0) hexResult = (hexResult << 4) + tmp;
					else throwError(state, "expected hexadecimal character");
				}
				state.result += charFromCodepoint(hexResult);
				state.position++;
			} else throwError(state, "unknown escape sequence");
			captureStart = captureEnd = state.position;
		} else if (is_EOL(ch)) {
			captureSegment(state, captureStart, captureEnd, true);
			writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
			captureStart = captureEnd = state.position;
		} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
		else {
			state.position++;
			captureEnd = state.position;
		}
		throwError(state, "unexpected end of the stream within a double quoted scalar");
	}
	function readFlowCollection(state, nodeIndent) {
		var readNext = true, _line, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = {}, keyNode, keyTag, valueNode, ch = state.input.charCodeAt(state.position);
		if (ch === 91) {
			terminator = 93;
			isMapping = false;
			_result = [];
		} else if (ch === 123) {
			terminator = 125;
			isMapping = true;
			_result = {};
		} else return false;
		if (state.anchor !== null) state.anchorMap[state.anchor] = _result;
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
			keyTag = keyNode = valueNode = null;
			isPair = isExplicitPair = false;
			if (ch === 63) {
				following = state.input.charCodeAt(state.position + 1);
				if (is_WS_OR_EOL(following)) {
					isPair = isExplicitPair = true;
					state.position++;
					skipSeparationSpace(state, true, nodeIndent);
				}
			}
			_line = state.line;
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
			if (isMapping) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode);
			else if (isPair) _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode));
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
		var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch = state.input.charCodeAt(state.position);
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
		if (is_WHITE_SPACE(ch)) {
			do
				ch = state.input.charCodeAt(++state.position);
			while (is_WHITE_SPACE(ch));
			if (ch === 35) do
				ch = state.input.charCodeAt(++state.position);
			while (!is_EOL(ch) && ch !== 0);
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
			if (is_EOL(ch)) {
				emptyLines++;
				continue;
			}
			if (state.lineIndent < textIndent) {
				if (chomping === CHOMPING_KEEP) state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
				else if (chomping === CHOMPING_CLIP) {
					if (didReadContent) state.result += "\n";
				}
				break;
			}
			if (folding) if (is_WHITE_SPACE(ch)) {
				atMoreIndented = true;
				state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
			} else if (atMoreIndented) {
				atMoreIndented = false;
				state.result += common.repeat("\n", emptyLines + 1);
			} else if (emptyLines === 0) {
				if (didReadContent) state.result += " ";
			} else state.result += common.repeat("\n", emptyLines);
			else state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
			didReadContent = true;
			detectedIndent = true;
			emptyLines = 0;
			captureStart = state.position;
			while (!is_EOL(ch) && ch !== 0) ch = state.input.charCodeAt(++state.position);
			captureSegment(state, captureStart, state.position, false);
		}
		return true;
	}
	function readBlockSequence(state, nodeIndent) {
		var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
		if (state.anchor !== null) state.anchorMap[state.anchor] = _result;
		ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			if (ch !== 45) break;
			following = state.input.charCodeAt(state.position + 1);
			if (!is_WS_OR_EOL(following)) break;
			detected = true;
			state.position++;
			if (skipSeparationSpace(state, true, -1)) {
				if (state.lineIndent <= nodeIndent) {
					_result.push(null);
					ch = state.input.charCodeAt(state.position);
					continue;
				}
			}
			_line = state.line;
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
		var following, allowCompact, _line, _pos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = {}, keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
		if (state.anchor !== null) state.anchorMap[state.anchor] = _result;
		ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			following = state.input.charCodeAt(state.position + 1);
			_line = state.line;
			_pos = state.position;
			if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
				if (ch === 63) {
					if (atExplicitKey) {
						storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
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
			} else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) if (state.line === _line) {
				ch = state.input.charCodeAt(state.position);
				while (is_WHITE_SPACE(ch)) ch = state.input.charCodeAt(++state.position);
				if (ch === 58) {
					ch = state.input.charCodeAt(++state.position);
					if (!is_WS_OR_EOL(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
					if (atExplicitKey) {
						storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
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
			else break;
			if (state.line === _line || state.lineIndent > nodeIndent) {
				if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) if (atExplicitKey) keyNode = state.result;
				else valueNode = state.result;
				if (!atExplicitKey) {
					storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _pos);
					keyTag = keyNode = valueNode = null;
				}
				skipSeparationSpace(state, true, -1);
				ch = state.input.charCodeAt(state.position);
			}
			if (state.lineIndent > nodeIndent && ch !== 0) throwError(state, "bad indentation of a mapping entry");
			else if (state.lineIndent < nodeIndent) break;
		}
		if (atExplicitKey) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
		if (detected) {
			state.tag = _tag;
			state.anchor = _anchor;
			state.kind = "mapping";
			state.result = _result;
		}
		return detected;
	}
	function readTagProperty(state) {
		var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch = state.input.charCodeAt(state.position);
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
		_position = state.position;
		if (isVerbatim) {
			do
				ch = state.input.charCodeAt(++state.position);
			while (ch !== 0 && ch !== 62);
			if (state.position < state.length) {
				tagName = state.input.slice(_position, state.position);
				ch = state.input.charCodeAt(++state.position);
			} else throwError(state, "unexpected end of the stream within a verbatim tag");
		} else {
			while (ch !== 0 && !is_WS_OR_EOL(ch)) {
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
		if (isVerbatim) state.tag = tagName;
		else if (_hasOwnProperty.call(state.tagMap, tagHandle)) state.tag = state.tagMap[tagHandle] + tagName;
		else if (tagHandle === "!") state.tag = "!" + tagName;
		else if (tagHandle === "!!") state.tag = "tag:yaml.org,2002:" + tagName;
		else throwError(state, "undeclared tag handle \"" + tagHandle + "\"");
		return true;
	}
	function readAnchorProperty(state) {
		var _position, ch = state.input.charCodeAt(state.position);
		if (ch !== 38) return false;
		if (state.anchor !== null) throwError(state, "duplication of an anchor property");
		ch = state.input.charCodeAt(++state.position);
		_position = state.position;
		while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) ch = state.input.charCodeAt(++state.position);
		if (state.position === _position) throwError(state, "name of an anchor node must contain at least one character");
		state.anchor = state.input.slice(_position, state.position);
		return true;
	}
	function readAlias(state) {
		var _position, alias, ch = state.input.charCodeAt(state.position);
		if (ch !== 42) return false;
		ch = state.input.charCodeAt(++state.position);
		_position = state.position;
		while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) ch = state.input.charCodeAt(++state.position);
		if (state.position === _position) throwError(state, "name of an alias node must contain at least one character");
		alias = state.input.slice(_position, state.position);
		if (!_hasOwnProperty.call(state.anchorMap, alias)) throwError(state, "unidentified alias \"" + alias + "\"");
		state.result = state.anchorMap[alias];
		skipSeparationSpace(state, true, -1);
		return true;
	}
	function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
		var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, type, flowIndent, blockIndent;
		if (state.listener !== null) state.listener("open", state);
		state.tag = null;
		state.anchor = null;
		state.kind = null;
		state.result = null;
		allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
		if (allowToSeek) {
			if (skipSeparationSpace(state, true, -1)) {
				atNewLine = true;
				if (state.lineIndent > parentIndent) indentStatus = 1;
				else if (state.lineIndent === parentIndent) indentStatus = 0;
				else if (state.lineIndent < parentIndent) indentStatus = -1;
			}
		}
		if (indentStatus === 1) while (readTagProperty(state) || readAnchorProperty(state)) if (skipSeparationSpace(state, true, -1)) {
			atNewLine = true;
			allowBlockCollections = allowBlockStyles;
			if (state.lineIndent > parentIndent) indentStatus = 1;
			else if (state.lineIndent === parentIndent) indentStatus = 0;
			else if (state.lineIndent < parentIndent) indentStatus = -1;
		} else allowBlockCollections = false;
		if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
		if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
			if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) flowIndent = parentIndent;
			else flowIndent = parentIndent + 1;
			blockIndent = state.position - state.lineStart;
			if (indentStatus === 1) if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) hasContent = true;
			else {
				if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) hasContent = true;
				else if (readAlias(state)) {
					hasContent = true;
					if (state.tag !== null || state.anchor !== null) throwError(state, "alias node should not have any properties");
				} else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
					hasContent = true;
					if (state.tag === null) state.tag = "?";
				}
				if (state.anchor !== null) state.anchorMap[state.anchor] = state.result;
			}
			else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
		}
		if (state.tag !== null && state.tag !== "!") if (state.tag === "?") {
			if (state.result !== null && state.kind !== "scalar") throwError(state, "unacceptable node kind for !<?> tag; it should be \"scalar\", not \"" + state.kind + "\"");
			for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
				type = state.implicitTypes[typeIndex];
				if (type.resolve(state.result)) {
					state.result = type.construct(state.result);
					state.tag = type.tag;
					if (state.anchor !== null) state.anchorMap[state.anchor] = state.result;
					break;
				}
			}
		} else if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
			type = state.typeMap[state.kind || "fallback"][state.tag];
			if (state.result !== null && type.kind !== state.kind) throwError(state, "unacceptable node kind for !<" + state.tag + "> tag; it should be \"" + type.kind + "\", not \"" + state.kind + "\"");
			if (!type.resolve(state.result)) throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
			else {
				state.result = type.construct(state.result);
				if (state.anchor !== null) state.anchorMap[state.anchor] = state.result;
			}
		} else throwError(state, "unknown tag !<" + state.tag + ">");
		if (state.listener !== null) state.listener("close", state);
		return state.tag !== null || state.anchor !== null || hasContent;
	}
	function readDocument(state) {
		var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
		state.version = null;
		state.checkLineBreaks = state.legacy;
		state.tagMap = {};
		state.anchorMap = {};
		while ((ch = state.input.charCodeAt(state.position)) !== 0) {
			skipSeparationSpace(state, true, -1);
			ch = state.input.charCodeAt(state.position);
			if (state.lineIndent > 0 || ch !== 37) break;
			hasDirectives = true;
			ch = state.input.charCodeAt(++state.position);
			_position = state.position;
			while (ch !== 0 && !is_WS_OR_EOL(ch)) ch = state.input.charCodeAt(++state.position);
			directiveName = state.input.slice(_position, state.position);
			directiveArgs = [];
			if (directiveName.length < 1) throwError(state, "directive name must not be less than one character in length");
			while (ch !== 0) {
				while (is_WHITE_SPACE(ch)) ch = state.input.charCodeAt(++state.position);
				if (ch === 35) {
					do
						ch = state.input.charCodeAt(++state.position);
					while (ch !== 0 && !is_EOL(ch));
					break;
				}
				if (is_EOL(ch)) break;
				_position = state.position;
				while (ch !== 0 && !is_WS_OR_EOL(ch)) ch = state.input.charCodeAt(++state.position);
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
		else return;
	}
	function loadDocuments(input, options) {
		input = String(input);
		options = options || {};
		if (input.length !== 0) {
			if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) input += "\n";
			if (input.charCodeAt(0) === 65279) input = input.slice(1);
		}
		var state = new State(input, options);
		var nullpos = input.indexOf("\0");
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
	function loadAll(input, iterator, options) {
		if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
			options = iterator;
			iterator = null;
		}
		var documents = loadDocuments(input, options);
		if (typeof iterator !== "function") return documents;
		for (var index = 0, length = documents.length; index < length; index += 1) iterator(documents[index]);
	}
	function load(input, options) {
		var documents = loadDocuments(input, options);
		if (documents.length === 0) return;
		else if (documents.length === 1) return documents[0];
		throw new YAMLException("expected a single document in the stream, but found more");
	}
	function safeLoadAll(input, iterator, options) {
		if (typeof iterator === "object" && iterator !== null && typeof options === "undefined") {
			options = iterator;
			iterator = null;
		}
		return loadAll(input, iterator, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
	}
	function safeLoad(input, options) {
		return load(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
	}
	module.exports.loadAll = loadAll;
	module.exports.load = load;
	module.exports.safeLoadAll = safeLoadAll;
	module.exports.safeLoad = safeLoad;
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml/dumper.js
var require_dumper = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common();
	var YAMLException = require_exception();
	var DEFAULT_FULL_SCHEMA = require_default_full();
	var DEFAULT_SAFE_SCHEMA = require_default_safe();
	var _toString = Object.prototype.toString;
	var _hasOwnProperty = Object.prototype.hasOwnProperty;
	var CHAR_TAB = 9;
	var CHAR_LINE_FEED = 10;
	var CHAR_CARRIAGE_RETURN = 13;
	var CHAR_SPACE = 32;
	var CHAR_EXCLAMATION = 33;
	var CHAR_DOUBLE_QUOTE = 34;
	var CHAR_SHARP = 35;
	var CHAR_PERCENT = 37;
	var CHAR_AMPERSAND = 38;
	var CHAR_SINGLE_QUOTE = 39;
	var CHAR_ASTERISK = 42;
	var CHAR_COMMA = 44;
	var CHAR_MINUS = 45;
	var CHAR_COLON = 58;
	var CHAR_EQUALS = 61;
	var CHAR_GREATER_THAN = 62;
	var CHAR_QUESTION = 63;
	var CHAR_COMMERCIAL_AT = 64;
	var CHAR_LEFT_SQUARE_BRACKET = 91;
	var CHAR_RIGHT_SQUARE_BRACKET = 93;
	var CHAR_GRAVE_ACCENT = 96;
	var CHAR_LEFT_CURLY_BRACKET = 123;
	var CHAR_VERTICAL_LINE = 124;
	var CHAR_RIGHT_CURLY_BRACKET = 125;
	var ESCAPE_SEQUENCES = {};
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
	var DEPRECATED_BOOLEANS_SYNTAX = [
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
	function compileStyleMap(schema, map) {
		var result, keys, index, length, tag, style, type;
		if (map === null) return {};
		result = {};
		keys = Object.keys(map);
		for (index = 0, length = keys.length; index < length; index += 1) {
			tag = keys[index];
			style = String(map[tag]);
			if (tag.slice(0, 2) === "!!") tag = "tag:yaml.org,2002:" + tag.slice(2);
			type = schema.compiledTypeMap["fallback"][tag];
			if (type && _hasOwnProperty.call(type.styleAliases, style)) style = type.styleAliases[style];
			result[tag] = style;
		}
		return result;
	}
	function encodeHex(character) {
		var string = character.toString(16).toUpperCase(), handle, length;
		if (character <= 255) {
			handle = "x";
			length = 2;
		} else if (character <= 65535) {
			handle = "u";
			length = 4;
		} else if (character <= 4294967295) {
			handle = "U";
			length = 8;
		} else throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
		return "\\" + handle + common.repeat("0", length - string.length) + string;
	}
	function State(options) {
		this.schema = options["schema"] || DEFAULT_FULL_SCHEMA;
		this.indent = Math.max(1, options["indent"] || 2);
		this.noArrayIndent = options["noArrayIndent"] || false;
		this.skipInvalid = options["skipInvalid"] || false;
		this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
		this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
		this.sortKeys = options["sortKeys"] || false;
		this.lineWidth = options["lineWidth"] || 80;
		this.noRefs = options["noRefs"] || false;
		this.noCompatMode = options["noCompatMode"] || false;
		this.condenseFlow = options["condenseFlow"] || false;
		this.implicitTypes = this.schema.compiledImplicit;
		this.explicitTypes = this.schema.compiledExplicit;
		this.tag = null;
		this.result = "";
		this.duplicates = [];
		this.usedDuplicates = null;
	}
	function indentString(string, spaces) {
		var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
		while (position < length) {
			next = string.indexOf("\n", position);
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
		return "\n" + common.repeat(" ", state.indent * level);
	}
	function testImplicitResolving(state, str) {
		var index, length, type;
		for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
			type = state.implicitTypes[index];
			if (type.resolve(str)) return true;
		}
		return false;
	}
	function isWhitespace(c) {
		return c === CHAR_SPACE || c === CHAR_TAB;
	}
	function isPrintable(c) {
		return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== 65279 || 65536 <= c && c <= 1114111;
	}
	function isNsChar(c) {
		return isPrintable(c) && !isWhitespace(c) && c !== 65279 && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
	}
	function isPlainSafe(c, prev) {
		return isPrintable(c) && c !== 65279 && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_COLON && (c !== CHAR_SHARP || prev && isNsChar(prev));
	}
	function isPlainSafeFirst(c) {
		return isPrintable(c) && c !== 65279 && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
	}
	function needIndentIndicator(string) {
		return /^\n* /.test(string);
	}
	var STYLE_PLAIN = 1, STYLE_SINGLE = 2, STYLE_LITERAL = 3, STYLE_FOLDED = 4, STYLE_DOUBLE = 5;
	function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
		var i;
		var char, prev_char;
		var hasLineBreak = false;
		var hasFoldableLine = false;
		var shouldTrackWidth = lineWidth !== -1;
		var previousLineBreak = -1;
		var plain = isPlainSafeFirst(string.charCodeAt(0)) && !isWhitespace(string.charCodeAt(string.length - 1));
		if (singleLineOnly) for (i = 0; i < string.length; i++) {
			char = string.charCodeAt(i);
			if (!isPrintable(char)) return STYLE_DOUBLE;
			prev_char = i > 0 ? string.charCodeAt(i - 1) : null;
			plain = plain && isPlainSafe(char, prev_char);
		}
		else {
			for (i = 0; i < string.length; i++) {
				char = string.charCodeAt(i);
				if (char === CHAR_LINE_FEED) {
					hasLineBreak = true;
					if (shouldTrackWidth) {
						hasFoldableLine = hasFoldableLine || i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
						previousLineBreak = i;
					}
				} else if (!isPrintable(char)) return STYLE_DOUBLE;
				prev_char = i > 0 ? string.charCodeAt(i - 1) : null;
				plain = plain && isPlainSafe(char, prev_char);
			}
			hasFoldableLine = hasFoldableLine || shouldTrackWidth && i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
		}
		if (!hasLineBreak && !hasFoldableLine) return plain && !testAmbiguousType(string) ? STYLE_PLAIN : STYLE_SINGLE;
		if (indentPerLevel > 9 && needIndentIndicator(string)) return STYLE_DOUBLE;
		return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
	}
	function writeScalar(state, string, level, iskey) {
		state.dump = function() {
			if (string.length === 0) return "''";
			if (!state.noCompatMode && DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) return "'" + string + "'";
			var indent = state.indent * Math.max(1, level);
			var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
			var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
			function testAmbiguity(string) {
				return testImplicitResolving(state, string);
			}
			switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
				case STYLE_PLAIN: return string;
				case STYLE_SINGLE: return "'" + string.replace(/'/g, "''") + "'";
				case STYLE_LITERAL: return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
				case STYLE_FOLDED: return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
				case STYLE_DOUBLE: return "\"" + escapeString(string, lineWidth) + "\"";
				default: throw new YAMLException("impossible error: invalid scalar style");
			}
		}();
	}
	function blockHeader(string, indentPerLevel) {
		var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
		var clip = string[string.length - 1] === "\n";
		return indentIndicator + (clip && (string[string.length - 2] === "\n" || string === "\n") ? "+" : clip ? "" : "-") + "\n";
	}
	function dropEndingNewline(string) {
		return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
	}
	function foldString(string, width) {
		var lineRe = /(\n+)([^\n]*)/g;
		var result = function() {
			var nextLF = string.indexOf("\n");
			nextLF = nextLF !== -1 ? nextLF : string.length;
			lineRe.lastIndex = nextLF;
			return foldLine(string.slice(0, nextLF), width);
		}();
		var prevMoreIndented = string[0] === "\n" || string[0] === " ";
		var moreIndented;
		var match;
		while (match = lineRe.exec(string)) {
			var prefix = match[1], line = match[2];
			moreIndented = line[0] === " ";
			result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
			prevMoreIndented = moreIndented;
		}
		return result;
	}
	function foldLine(line, width) {
		if (line === "" || line[0] === " ") return line;
		var breakRe = / [^ ]/g;
		var match;
		var start = 0, end, curr = 0, next = 0;
		var result = "";
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
		var result = "";
		var char, nextChar;
		var escapeSeq;
		for (var i = 0; i < string.length; i++) {
			char = string.charCodeAt(i);
			if (char >= 55296 && char <= 56319) {
				nextChar = string.charCodeAt(i + 1);
				if (nextChar >= 56320 && nextChar <= 57343) {
					result += encodeHex((char - 55296) * 1024 + nextChar - 56320 + 65536);
					i++;
					continue;
				}
			}
			escapeSeq = ESCAPE_SEQUENCES[char];
			result += !escapeSeq && isPrintable(char) ? string[i] : escapeSeq || encodeHex(char);
		}
		return result;
	}
	function writeFlowSequence(state, level, object) {
		var _result = "", _tag = state.tag, index, length;
		for (index = 0, length = object.length; index < length; index += 1) if (writeNode(state, level, object[index], false, false)) {
			if (index !== 0) _result += "," + (!state.condenseFlow ? " " : "");
			_result += state.dump;
		}
		state.tag = _tag;
		state.dump = "[" + _result + "]";
	}
	function writeBlockSequence(state, level, object, compact) {
		var _result = "", _tag = state.tag, index, length;
		for (index = 0, length = object.length; index < length; index += 1) if (writeNode(state, level + 1, object[index], true, true)) {
			if (!compact || index !== 0) _result += generateNextLine(state, level);
			if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) _result += "-";
			else _result += "- ";
			_result += state.dump;
		}
		state.tag = _tag;
		state.dump = _result || "[]";
	}
	function writeFlowMapping(state, level, object) {
		var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
		for (index = 0, length = objectKeyList.length; index < length; index += 1) {
			pairBuffer = "";
			if (index !== 0) pairBuffer += ", ";
			if (state.condenseFlow) pairBuffer += "\"";
			objectKey = objectKeyList[index];
			objectValue = object[objectKey];
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
		var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
		if (state.sortKeys === true) objectKeyList.sort();
		else if (typeof state.sortKeys === "function") objectKeyList.sort(state.sortKeys);
		else if (state.sortKeys) throw new YAMLException("sortKeys must be a boolean or a function");
		for (index = 0, length = objectKeyList.length; index < length; index += 1) {
			pairBuffer = "";
			if (!compact || index !== 0) pairBuffer += generateNextLine(state, level);
			objectKey = objectKeyList[index];
			objectValue = object[objectKey];
			if (!writeNode(state, level + 1, objectKey, true, true, true)) continue;
			explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
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
		var _result, typeList = explicit ? state.explicitTypes : state.implicitTypes, index, length, type, style;
		for (index = 0, length = typeList.length; index < length; index += 1) {
			type = typeList[index];
			if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
				state.tag = explicit ? type.tag : "?";
				if (type.represent) {
					style = state.styleMap[type.tag] || type.defaultStyle;
					if (_toString.call(type.represent) === "[object Function]") _result = type.represent(object, style);
					else if (_hasOwnProperty.call(type.represent, style)) _result = type.represent[style](object, style);
					else throw new YAMLException("!<" + type.tag + "> tag resolver accepts not \"" + style + "\" style");
					state.dump = _result;
				}
				return true;
			}
		}
		return false;
	}
	function writeNode(state, level, object, block, compact, iskey) {
		state.tag = null;
		state.dump = object;
		if (!detectType(state, object, false)) detectType(state, object, true);
		var type = _toString.call(state.dump);
		if (block) block = state.flowLevel < 0 || state.flowLevel > level;
		var objectOrArray = type === "[object Object]" || type === "[object Array]", duplicateIndex, duplicate;
		if (objectOrArray) {
			duplicateIndex = state.duplicates.indexOf(object);
			duplicate = duplicateIndex !== -1;
		}
		if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) compact = false;
		if (duplicate && state.usedDuplicates[duplicateIndex]) state.dump = "*ref_" + duplicateIndex;
		else {
			if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) state.usedDuplicates[duplicateIndex] = true;
			if (type === "[object Object]") if (block && Object.keys(state.dump).length !== 0) {
				writeBlockMapping(state, level, state.dump, compact);
				if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
			} else {
				writeFlowMapping(state, level, state.dump);
				if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
			}
			else if (type === "[object Array]") {
				var arrayLevel = state.noArrayIndent && level > 0 ? level - 1 : level;
				if (block && state.dump.length !== 0) {
					writeBlockSequence(state, arrayLevel, state.dump, compact);
					if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
				} else {
					writeFlowSequence(state, arrayLevel, state.dump);
					if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
				}
			} else if (type === "[object String]") {
				if (state.tag !== "?") writeScalar(state, state.dump, level, iskey);
			} else {
				if (state.skipInvalid) return false;
				throw new YAMLException("unacceptable kind of an object to dump " + type);
			}
			if (state.tag !== null && state.tag !== "?") state.dump = "!<" + state.tag + "> " + state.dump;
		}
		return true;
	}
	function getDuplicateReferences(object, state) {
		var objects = [], duplicatesIndexes = [], index, length;
		inspectNode(object, objects, duplicatesIndexes);
		for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) state.duplicates.push(objects[duplicatesIndexes[index]]);
		state.usedDuplicates = new Array(length);
	}
	function inspectNode(object, objects, duplicatesIndexes) {
		var objectKeyList, index, length;
		if (object !== null && typeof object === "object") {
			index = objects.indexOf(object);
			if (index !== -1) {
				if (duplicatesIndexes.indexOf(index) === -1) duplicatesIndexes.push(index);
			} else {
				objects.push(object);
				if (Array.isArray(object)) for (index = 0, length = object.length; index < length; index += 1) inspectNode(object[index], objects, duplicatesIndexes);
				else {
					objectKeyList = Object.keys(object);
					for (index = 0, length = objectKeyList.length; index < length; index += 1) inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
				}
			}
		}
	}
	function dump(input, options) {
		options = options || {};
		var state = new State(options);
		if (!state.noRefs) getDuplicateReferences(input, state);
		if (writeNode(state, 0, input, true, true)) return state.dump + "\n";
		return "";
	}
	function safeDump(input, options) {
		return dump(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
	}
	module.exports.dump = dump;
	module.exports.safeDump = safeDump;
}));
//#endregion
//#region node_modules/js-yaml/lib/js-yaml.js
var require_js_yaml$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var loader = require_loader();
	var dumper = require_dumper();
	function deprecated(name) {
		return function() {
			throw new Error("Function " + name + " is deprecated and cannot be used.");
		};
	}
	module.exports.Type = require_type();
	module.exports.Schema = require_schema();
	module.exports.FAILSAFE_SCHEMA = require_failsafe();
	module.exports.JSON_SCHEMA = require_json();
	module.exports.CORE_SCHEMA = require_core();
	module.exports.DEFAULT_SAFE_SCHEMA = require_default_safe();
	module.exports.DEFAULT_FULL_SCHEMA = require_default_full();
	module.exports.load = loader.load;
	module.exports.loadAll = loader.loadAll;
	module.exports.safeLoad = loader.safeLoad;
	module.exports.safeLoadAll = loader.safeLoadAll;
	module.exports.dump = dumper.dump;
	module.exports.safeDump = dumper.safeDump;
	module.exports.YAMLException = require_exception();
	module.exports.MINIMAL_SCHEMA = require_failsafe();
	module.exports.SAFE_SCHEMA = require_default_safe();
	module.exports.DEFAULT_SCHEMA = require_default_full();
	module.exports.scan = deprecated("scan");
	module.exports.parse = deprecated("parse");
	module.exports.compose = deprecated("compose");
	module.exports.addConstructor = deprecated("addConstructor");
}));
//#endregion
//#region node_modules/js-yaml/index.js
var require_js_yaml = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_js_yaml$1();
}));
//#endregion
//#region node_modules/gray-matter/lib/engines.js
var require_engines = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const yaml = require_js_yaml();
	/**
	* Default engines
	*/
	const engines = exports = module.exports;
	/**
	* YAML
	*/
	engines.yaml = {
		parse: yaml.safeLoad.bind(yaml),
		stringify: yaml.safeDump.bind(yaml)
	};
	/**
	* JSON
	*/
	engines.json = {
		parse: JSON.parse.bind(JSON),
		stringify: function(obj, options) {
			const opts = Object.assign({
				replacer: null,
				space: 2
			}, options);
			return JSON.stringify(obj, opts.replacer, opts.space);
		}
	};
	/**
	* JavaScript
	*/
	engines.javascript = {
		parse: function parse(str, options, wrap) {
			try {
				if (wrap !== false) str = "(function() {\nreturn " + str.trim() + ";\n}());";
				return eval(str) || {};
			} catch (err) {
				if (wrap !== false && /(unexpected|identifier)/i.test(err.message)) return parse(str, options, false);
				throw new SyntaxError(err);
			}
		},
		stringify: function() {
			throw new Error("stringifying JavaScript is not supported");
		}
	};
}));
//#endregion
//#region node_modules/strip-bom-string/index.js
/*!
* strip-bom-string <https://github.com/jonschlinkert/strip-bom-string>
*
* Copyright (c) 2015, 2017, Jon Schlinkert.
* Released under the MIT License.
*/
var require_strip_bom_string = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function(str) {
		if (typeof str === "string" && str.charAt(0) === "﻿") return str.slice(1);
		return str;
	};
}));
//#endregion
//#region node_modules/gray-matter/lib/utils.js
var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
	const stripBom = require_strip_bom_string();
	const typeOf = require_kind_of();
	exports.define = function(obj, key, val) {
		Reflect.defineProperty(obj, key, {
			enumerable: false,
			configurable: true,
			writable: true,
			value: val
		});
	};
	/**
	* Returns true if `val` is a buffer
	*/
	exports.isBuffer = function(val) {
		return typeOf(val) === "buffer";
	};
	/**
	* Returns true if `val` is an object
	*/
	exports.isObject = function(val) {
		return typeOf(val) === "object";
	};
	/**
	* Cast `input` to a buffer
	*/
	exports.toBuffer = function(input) {
		return typeof input === "string" ? Buffer.from(input) : input;
	};
	/**
	* Cast `val` to a string.
	*/
	exports.toString = function(input) {
		if (exports.isBuffer(input)) return stripBom(String(input));
		if (typeof input !== "string") throw new TypeError("expected input to be a string or buffer");
		return stripBom(input);
	};
	/**
	* Cast `val` to an array.
	*/
	exports.arrayify = function(val) {
		return val ? Array.isArray(val) ? val : [val] : [];
	};
	/**
	* Returns true if `str` starts with `substr`.
	*/
	exports.startsWith = function(str, substr, len) {
		if (typeof len !== "number") len = substr.length;
		return str.slice(0, len) === substr;
	};
}));
//#endregion
//#region node_modules/gray-matter/lib/defaults.js
var require_defaults = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const engines = require_engines();
	const utils = require_utils();
	module.exports = function(options) {
		const opts = Object.assign({}, options);
		opts.delimiters = utils.arrayify(opts.delims || opts.delimiters || "---");
		if (opts.delimiters.length === 1) opts.delimiters.push(opts.delimiters[0]);
		opts.language = (opts.language || opts.lang || "yaml").toLowerCase();
		opts.engines = Object.assign({}, engines, opts.parsers, opts.engines);
		return opts;
	};
}));
//#endregion
//#region node_modules/gray-matter/lib/engine.js
var require_engine = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function(name, options) {
		let engine = options.engines[name] || options.engines[aliase(name)];
		if (typeof engine === "undefined") throw new Error("gray-matter engine \"" + name + "\" is not registered");
		if (typeof engine === "function") engine = { parse: engine };
		return engine;
	};
	function aliase(name) {
		switch (name.toLowerCase()) {
			case "js":
			case "javascript": return "javascript";
			case "coffee":
			case "coffeescript":
			case "cson": return "coffee";
			case "yaml":
			case "yml": return "yaml";
			default: return name;
		}
	}
}));
//#endregion
//#region node_modules/gray-matter/lib/stringify.js
var require_stringify = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const typeOf = require_kind_of();
	const getEngine = require_engine();
	const defaults = require_defaults();
	module.exports = function(file, data, options) {
		if (data == null && options == null) switch (typeOf(file)) {
			case "object":
				data = file.data;
				options = {};
				break;
			case "string": return file;
			default: throw new TypeError("expected file to be a string or object");
		}
		const str = file.content;
		const opts = defaults(options);
		if (data == null) {
			if (!opts.data) return file;
			data = opts.data;
		}
		const language = file.language || opts.language;
		const engine = getEngine(language, opts);
		if (typeof engine.stringify !== "function") throw new TypeError("expected \"" + language + ".stringify\" to be a function");
		data = Object.assign({}, file.data, data);
		const open = opts.delimiters[0];
		const close = opts.delimiters[1];
		const matter = engine.stringify(data, options).trim();
		let buf = "";
		if (matter !== "{}") buf = newline(open) + newline(matter) + newline(close);
		if (typeof file.excerpt === "string" && file.excerpt !== "") {
			if (str.indexOf(file.excerpt.trim()) === -1) buf += newline(file.excerpt) + newline(close);
		}
		return buf + newline(str);
	};
	function newline(str) {
		return str.slice(-1) !== "\n" ? str + "\n" : str;
	}
}));
//#endregion
//#region node_modules/gray-matter/lib/excerpt.js
var require_excerpt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const defaults = require_defaults();
	module.exports = function(file, options) {
		const opts = defaults(options);
		if (file.data == null) file.data = {};
		if (typeof opts.excerpt === "function") return opts.excerpt(file, opts);
		const sep = file.data.excerpt_separator || opts.excerpt_separator;
		if (sep == null && (opts.excerpt === false || opts.excerpt == null)) return file;
		const delimiter = typeof opts.excerpt === "string" ? opts.excerpt : sep || opts.delimiters[0];
		const idx = file.content.indexOf(delimiter);
		if (idx !== -1) file.excerpt = file.content.slice(0, idx);
		return file;
	};
}));
//#endregion
//#region node_modules/gray-matter/lib/to-file.js
var require_to_file = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const typeOf = require_kind_of();
	const stringify = require_stringify();
	const utils = require_utils();
	/**
	* Normalize the given value to ensure an object is returned
	* with the expected properties.
	*/
	module.exports = function(file) {
		if (typeOf(file) !== "object") file = { content: file };
		if (typeOf(file.data) !== "object") file.data = {};
		if (file.contents && file.content == null) file.content = file.contents;
		utils.define(file, "orig", utils.toBuffer(file.content));
		utils.define(file, "language", file.language || "");
		utils.define(file, "matter", file.matter || "");
		utils.define(file, "stringify", function(data, options) {
			if (options && options.language) file.language = options.language;
			return stringify(file, data, options);
		});
		file.content = utils.toString(file.content);
		file.isEmpty = false;
		file.excerpt = "";
		return file;
	};
}));
//#endregion
//#region node_modules/gray-matter/lib/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const getEngine = require_engine();
	const defaults = require_defaults();
	module.exports = function(language, str, options) {
		const opts = defaults(options);
		const engine = getEngine(language, opts);
		if (typeof engine.parse !== "function") throw new TypeError("expected \"" + language + ".parse\" to be a function");
		return engine.parse(str, opts);
	};
}));
//#endregion
//#region node_modules/gray-matter/index.js
var require_gray_matter = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const fs$1 = __require$1("fs");
	const sections = require_section_matter();
	const defaults = require_defaults();
	const stringify = require_stringify();
	const excerpt = require_excerpt();
	const engines = require_engines();
	const toFile = require_to_file();
	const parse = require_parse();
	const utils = require_utils();
	/**
	* Takes a string or object with `content` property, extracts
	* and parses front-matter from the string, then returns an object
	* with `data`, `content` and other [useful properties](#returned-object).
	*
	* ```js
	* const matter = require('gray-matter');
	* console.log(matter('---\ntitle: Home\n---\nOther stuff'));
	* //=> { data: { title: 'Home'}, content: 'Other stuff' }
	* ```
	* @param {Object|String} `input` String, or object with `content` string
	* @param {Object} `options`
	* @return {Object}
	* @api public
	*/
	function matter(input, options) {
		if (input === "") return {
			data: {},
			content: input,
			excerpt: "",
			orig: input
		};
		let file = toFile(input);
		const cached = matter.cache[file.content];
		if (!options) {
			if (cached) {
				file = Object.assign({}, cached);
				file.orig = cached.orig;
				return file;
			}
			matter.cache[file.content] = file;
		}
		return parseMatter(file, options);
	}
	/**
	* Parse front matter
	*/
	function parseMatter(file, options) {
		const opts = defaults(options);
		const open = opts.delimiters[0];
		const close = "\n" + opts.delimiters[1];
		let str = file.content;
		if (opts.language) file.language = opts.language;
		const openLen = open.length;
		if (!utils.startsWith(str, open, openLen)) {
			excerpt(file, opts);
			return file;
		}
		if (str.charAt(openLen) === open.slice(-1)) return file;
		str = str.slice(openLen);
		const len = str.length;
		const language = matter.language(str, opts);
		if (language.name) {
			file.language = language.name;
			str = str.slice(language.raw.length);
		}
		let closeIndex = str.indexOf(close);
		if (closeIndex === -1) closeIndex = len;
		file.matter = str.slice(0, closeIndex);
		if (file.matter.replace(/^\s*#[^\n]+/gm, "").trim() === "") {
			file.isEmpty = true;
			file.empty = file.content;
			file.data = {};
		} else file.data = parse(file.language, file.matter, opts);
		if (closeIndex === len) file.content = "";
		else {
			file.content = str.slice(closeIndex + close.length);
			if (file.content[0] === "\r") file.content = file.content.slice(1);
			if (file.content[0] === "\n") file.content = file.content.slice(1);
		}
		excerpt(file, opts);
		if (opts.sections === true || typeof opts.section === "function") sections(file, opts.section);
		return file;
	}
	/**
	* Expose engines
	*/
	matter.engines = engines;
	/**
	* Stringify an object to YAML or the specified language, and
	* append it to the given string. By default, only YAML and JSON
	* can be stringified. See the [engines](#engines) section to learn
	* how to stringify other languages.
	*
	* ```js
	* console.log(matter.stringify('foo bar baz', {title: 'Home'}));
	* // results in:
	* // ---
	* // title: Home
	* // ---
	* // foo bar baz
	* ```
	* @param {String|Object} `file` The content string to append to stringified front-matter, or a file object with `file.content` string.
	* @param {Object} `data` Front matter to stringify.
	* @param {Object} `options` [Options](#options) to pass to gray-matter and [js-yaml].
	* @return {String} Returns a string created by wrapping stringified yaml with delimiters, and appending that to the given string.
	* @api public
	*/
	matter.stringify = function(file, data, options) {
		if (typeof file === "string") file = matter(file, options);
		return stringify(file, data, options);
	};
	/**
	* Synchronously read a file from the file system and parse
	* front matter. Returns the same object as the [main function](#matter).
	*
	* ```js
	* const file = matter.read('./content/blog-post.md');
	* ```
	* @param {String} `filepath` file path of the file to read.
	* @param {Object} `options` [Options](#options) to pass to gray-matter.
	* @return {Object} Returns [an object](#returned-object) with `data` and `content`
	* @api public
	*/
	matter.read = function(filepath, options) {
		const file = matter(fs$1.readFileSync(filepath, "utf8"), options);
		file.path = filepath;
		return file;
	};
	/**
	* Returns true if the given `string` has front matter.
	* @param  {String} `string`
	* @param  {Object} `options`
	* @return {Boolean} True if front matter exists.
	* @api public
	*/
	matter.test = function(str, options) {
		return utils.startsWith(str, defaults(options).delimiters[0]);
	};
	/**
	* Detect the language to use, if one is defined after the
	* first front-matter delimiter.
	* @param  {String} `string`
	* @param  {Object} `options`
	* @return {Object} Object with `raw` (actual language string), and `name`, the language with whitespace trimmed
	*/
	matter.language = function(str, options) {
		const open = defaults(options).delimiters[0];
		if (matter.test(str)) str = str.slice(open.length);
		const language = str.slice(0, str.search(/\r?\n/));
		return {
			raw: language,
			name: language ? language.trim() : ""
		};
	};
	/**
	* Expose `matter`
	*/
	matter.cache = {};
	matter.clearCache = function() {
		matter.cache = {};
	};
	module.exports = matter;
}));
//#endregion
//#region src/lib/parse-entry.ts
/**
* gray-matter picks its parser from the language written right after the
* opening delimiter (`---js`, `---json`), and its JavaScript engine is a
* direct eval(). Left enabled, a journal entry whose frontmatter starts with
* `---js` runs arbitrary code inside `validate`, `index`, `recall` and the
* /recall skill — in CI, and on every machine that clones the repo
* (reproduced in the v1.3 audit: validate reported "0 errors" while the
* entry's code executed). Entries are YAML by contract (SCHEMA.md
* §Frontmatter Fields, §Parser Notes), so every non-YAML engine is replaced
* by one that throws; the lenient read path then degrades such a file to
* _parseError exactly like malformed YAML. `js`/`javascript` and `json` are
* the only engines gray-matter 4 registers besides yaml — any other language
* suffix is already an "engine not registered" throw.
*/
function refuseLanguage(language) {
	throw new Error(`frontmatter language "${language}" is not allowed — entries are YAML only`);
}
function blockedEngine(language) {
	return {
		parse: () => refuseLanguage(language),
		stringify: () => refuseLanguage(language)
	};
}
/**
* The ONLY way src/ may call gray-matter: non-YAML engines disabled.
* Passing options also bypasses gray-matter's process-wide parse cache
* (keyed by file content), which is a memory leak in long-lived callers.
* Frontmatter that parses to a non-object (a bare scalar, a list) is
* treated as empty data — the read path is lenient, never a crash.
*/
function safeMatter(raw) {
	const file = (0, import_gray_matter.default)(raw, { engines: YAML_ONLY_ENGINES });
	const parsed = file.data;
	return {
		data: typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {},
		content: file.content
	};
}
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
* SCHEMA.md Pitfall 1: unquoted "date: 2026-06-01" is parsed by gray-matter/js-yaml
* as a JavaScript Date object. Normalize it back to a string here.
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
* On YAMLException (or a refused non-YAML frontmatter language):
* returns { _file, _stem, _parseError: true }.
*
* Handles all three SCHEMA.md §Parser Notes pitfalls:
*   Pitfall 1 — date coercion (Date → YYYY-MM-DD string)
*   Pitfall 2 — scalar-to-array coercion for tags/files/links/supersedes
*   Pitfall 3 — YAMLException caught, returns _parseError flag
*/
function parseEntry(filePath, rawContent) {
	const stem = path.basename(filePath, ".md");
	try {
		const { data, content } = safeMatter(rawContent);
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
var import_gray_matter, CANONICAL_HEADINGS, YAML_ONLY_ENGINES, RESERVED_KEYS;
var init_parse_entry = __esmMin((() => {
	import_gray_matter = /* @__PURE__ */ __toESM(require_gray_matter(), 1);
	CANONICAL_HEADINGS = [
		"## What changed",
		"## Why / decisions",
		"## Alternatives rejected",
		"## Gotchas / risks",
		"## Verify-later / follow-ups"
	];
	YAML_ONLY_ENGINES = {
		js: blockedEngine("js"),
		javascript: blockedEngine("javascript"),
		json: blockedEngine("json")
	};
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
	PKG_ROOT$1 = path.basename(__dirname$2) === "dist" || path.basename(__dirname$2) === "bin" ? path.resolve(__dirname$2, "..") : path.resolve(__dirname$2, "..", "..");
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
					process.stdout.write(green("  [create]") + " " + dim(`${JOURNAL_DIR}/config.json (mode: ${jlMode})\n`));
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
				if (!existsSync(configPath) || jlConfigInvalid || args.mode !== void 0 || args.local) {
					await writeConfigMode(journalDir, jlMode, args.local ? "local" : void 0);
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
					const tail = jlLocal ? jlNoGit ? "  Storage:      local (no git repo here — nothing was excluded; the journal is machine-only)\n" : "  Storage:      LOCAL-ONLY — hidden via .git/info/exclude, never committed, no backup.\n                Make it a committed team journal later: whydone publish\n" : "  Commit the shared parts: git add " + JOURNAL_DIR + " CLAUDE.md\n";
					process.stdout.write(bold("whydone init --journal-only") + ` complete
  Journal dir:  ${dim(path.relative(cwd, journalDir) + "/")}\n  Mode:         ${jlModeLine}\n  CLAUDE.md:    marker block added/refreshed
  Skipped:      skills, lock-file, Stop hook — the plugin ships them;
                on the npm channel run \`npx whydone init\` for the full setup

` + tail);
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
				process.stdout.write(green("  [create]") + " " + dim(`${JOURNAL_DIR}/config.json (mode: ${mode})\n`));
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
			if (!existsSync(configPath) || configInvalid || explicit || useLocal) {
				await writeConfigMode(journalDir, mode, useLocal ? "local" : wizardAskedStorage ? "committed" : void 0);
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
				const storageLine = effLocal ? localNoGit ? "  Storage:          local (no git repo here — nothing to exclude)\n" : "  Storage:          LOCAL-ONLY — .whydone/ hidden via .git/info/exclude; no backup. `whydone publish` reverses.\n" : "";
				const step3 = effLocal ? "  3. The journal is local-only — nothing of it to commit. Commit the tooling if you want:\n       git add .claude/skills .claude/whydone.lock.json\n" : "  3. Commit the shared parts:\n       git add .whydone .claude/skills .claude/whydone.lock.json CLAUDE.md\n     (.claude/settings.local.json stays local — teammates run `npx whydone init` once after cloning.)\n";
				process.stdout.write(bold("whydone init") + ` complete
  Skills installed: ${green(String(installed))}, skipped: ${dim(String(skipped))}\n  Journal dir:      ${dim(path.relative(cwd, journalDir) + "/")}\n  Lock-file:        ${dim(path.relative(cwd, lockPath))}\n  Mode:             ${fullModeLine}\n` + storageLine + `  Stop hook:        ${hookLine}\n
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
		message: `schema must be 1, got ${entry.schema}`
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
	if (entry._scalarFields?.includes("tags")) errors.push({
		code: "BAD_TYPE",
		field: "tags",
		message: "tags must be a YAML array [...] not a bare scalar — see SCHEMA.md §Frontmatter Fields"
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
* (Unicode-aware — Cyrillic survives), drop tokens shorter than 2 chars,
* drop stopwords, dedupe, cap at 20 tokens.
*/
function tokenizeQuery(q) {
	const rawTokens = q.toLowerCase().split(/[^\p{L}\p{N}-]+/u);
	const seen = /* @__PURE__ */ new Set();
	const tokens = [];
	for (const token of rawTokens) {
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
var RECALL_WEIGHTS, STOPWORDS, STOPWORD_SET, MIN_TOKEN_LENGTH, MAX_QUERY_TOKENS, VERIFY_LATER_HEADING, DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT, FENCE_RE;
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
				body = safeMatter(raw).content;
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
	init_parse_entry();
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
	PKG_ROOT = path.basename(__dirname$1) === "dist" || path.basename(__dirname$1) === "bin" ? path.resolve(__dirname$1, "..") : path.resolve(__dirname$1, "..", "..");
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
