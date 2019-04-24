# hyf-lint

**hyf-lint** is a simple tool to perform rudimentary checks on the JavaScript homework of students, with a focus on naming conventions. It is not a replacement for ESLint.

It can generate the following messages (see file `src/constants.js` for an up-to-date list):

- SHOUT_CASE variables expected to be const.
- Expected camelCase name.
- Expected a PascalCase name following ‘new’.
- Expected let or const instead of var.
- Detected nested function declaration.
- Detected potentially commented-out code.
- Detected disabled ESLint rule(s).
- Detected deprecated HTML Element.
- Detected PascalCase function name.
- Detected noise word as name prefix or suffix.
- Detected single letter name.
- Detected ‘x the Unknown’ as a name.
- Detected ‘l’ as a name: easily confused with the number ‘1’.
- Detected numeric suffix in identifier.
- Detected iterative for-loop: suggest array method.

## Installation

```
npm install
```

```
npm link
```

## Run

```
hyflint <js-filename> | <directory>
```
