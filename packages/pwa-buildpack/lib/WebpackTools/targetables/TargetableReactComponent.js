const TargetableESModule = require('./TargetableESModule');

const lazyImportString = `{ lazy as reactLazy } from 'react';\n`;

/**
 * An ECMAScript module containing a React component with JSX to render it.
 *
 * Presents a convenient API for consumers to add common transforms to React
 * components and the JSX in them, in a semantic way.
 */
class TargetableReactComponent extends TargetableESModule {
    /** @inheritdoc */
    constructor(file, trackingOwner, ...args) {
        super(file, trackingOwner, ...args);
        this._lazyComponents = new Map();
    }
    /**
     * Add a new named dynamic import of another React component, using the `lazy`
     * wrapper for use with React.Suspense.
     *
     * @param {string} modulePath - Resolvable path to the module to import.
     * @param {string} [localName] - Optional human-readable name for debugging.
     * @returns {string} Name of the local binding of the element, to be used in JSX operations.
     */
    addLazyReactComponentImport(modulePath, localName = 'Component') {
        // Dedupe
        const alreadyAdded = this._lazyComponents.get(modulePath);
        if (alreadyAdded) {
            return alreadyAdded;
        }
        const elementName = this.uniqueIdentifier(
            'Dynamic' + localName.replace(/[\s-\.,]/g, '')
        );
        if (this._lazyComponents.size === 0) {
            // first one! add the known binding to lazy, so that we don't have
            // to count on someone else's React import statement.
            this.addImport(lazyImportString);
        }
        this._lazyComponents.set(modulePath, elementName);
        this.insertAfterSource(
            lazyImportString,
            `const ${elementName} = reactLazy(() => import('${modulePath}'));\n`
        );
        return elementName;
    }
    /**
     * Append a JSX element to the children of `element`.
     *
     * @param {string} jsxSearch - Match an existing JSX component in the file
     * @param {string} newChild - New element to insert, as a string.
     * @param {JSXModifierOptions} [options]
     * @chainable
     */
    appendJSX(element, newChild, options) {
        return this._addJsxTransform('append', element, newChild, options);
    }
    /**
     * Insert a JSX element _after_ `element`.
     *
     * @param {string} jsxSearch - Match an existing JSX component in the file
     * @param {string} newSibling - New element to insert, as a string.
     * @param {JSXModifierOptions} [options]
     * @chainable
     */
    insertAfterJSX(element, sibling, options) {
        return this._addJsxTransform('insertAfter', element, sibling, options);
    }
    /**
     * Insert a JSX element _before_ `element`.
     *
     * @param {string} jsxSearch - Match an existing JSX component in the file
     * @param {string} newSibling - New element to insert, as a string.
     * @param {JSXModifierOptions} [options]
     * @chainable
     */
    insertBeforeJSX(element, sibling, options) {
        return this._addJsxTransform('insertBefore', element, sibling, options);
    }
    /**
     * Prepend a JSX element to the children of `element`.
     *
     * @param {string} jsxSearch - Match an existing JSX component in the file
     * @param {string} newChild - New element to insert, as a string.
     * @param {JSXModifierOptions} [options]
     * @chainable
     */
    prependJSX(element, child, options) {
        return this._addJsxTransform('prepend', element, child, options);
    }

    /**
     * Remove the JSX node matched by 'element'.
     *
     * @param {string} jsxSearch - Match an existing JSX component in the file and remove it
     * @param {JSXModifierOptions} [options]
     * @chainable
     */
    removeJSX(element, options) {
        return this._addJsxTransform('remove', element, null, options);
    }

    /**
     * Remove JSX props from the element if they match one of the list of names.
     *
     * @param {string} jsxSearch - Match an existing JSX component in the file.
     * @param  {object} props - A simple object representing the props. Keys should be prop names, and values should be raw strings representing the value in JSX text.
     * @param {JSXModifierOptions} [options]
     * @chainable
     */
    removeJSXProps(element, props, options) {
        const params = options ? { ...options, props } : { props };
        return this._addJsxTransform('removeProps', element, null, params);
    }
    /**
     * Replace a JSX element with different code.
     *
     * @param {string} jsx - A JSX element matching the one in the source code
     * to modify. Use a JSX opening element or a self-closing element, like
     * '<Route path="/">'.
     * @param {string} replacement - Replacement code as a string.
     * @param {JSXModifierOptions} [options]
     */
    replaceJSX(element, replacement, options) {
        return this._addJsxTransform('replace', element, replacement, options);
    }

    /**
     * Set JSX props on a JSX element.
     *
     * @param {string} jsxSearch - Match an existing JSX component in the file.
     * @param  {object} props - A simple object representing the props. Keys should be prop names, and values should be raw strings representing the value in JSX text.
     * @param {JSXModifierOptions} [options]
     *
     * @example
     *
     * ```js
     * file.setJSXProps('Tab colorScheme="dark", {
     *   colorScheme: '"light"',
     *   className: '{classes.tabs}'
     * })
     * ```
     * @chainable
     */
    setJSXProps(element, props, options) {
        const params = options ? { ...options, props } : { props };
        return this._addJsxTransform('setProps', element, null, params);
    }

    /**
     * Wrap a JSX element in an outer element.
     *
     * @param {string} jsxSearch - Match an existing JSX component in the file.
     * @param {string} newParent - The wrapper element as a JSX string. It must be one and only one JSX element with no children; the matching element will be the only child of the new wrapper.
     * @param {JSXModifierOptions} [options]
     * @returns
     * @memberof TargetableReactComponent
     */
    surroundJSX(element, newParent, options) {
        return this._addJsxTransform('surround', element, newParent, options);
    }

    /**
     * The AST manipulation operations in this class all depend on the
     * BabelModifyJsxPlugin. This is a convenience method for adding
     * that transform.
     *
     * @private
     * @param {string} operation - The function of BabelModifyJSXPlugin to use.
     * @param {string} element - JSX string describing the element(s) to find.
     * @param {string} [jsx] - JSX string representing the main parameter to the operation, if applicable.
     * @param {JSXPluginOptions} [options] - Object of named parameters for that operation.
     */
    _addJsxTransform(operation, element, jsx, options) {
        let params = options;
        if (jsx) {
            params = { jsx };
            if (options) {
                Object.assign(params, options);
            }
        }
        return this.addTransform(
            'babel',
            require.resolve('./BabelModifyJSXPlugin'),
            { element, operation, params }
        );
    }
}

module.exports = TargetableReactComponent;
