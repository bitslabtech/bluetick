module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  let dirty = false;

  const excludedTags = ['button', 'a', 'Link', 'NavLink', 'Button', 'MenuItem', 'Tab', 'Toggle', 'Switch'];

  root.find(j.JSXOpeningElement).forEach(path => {
    const node = path.node;
    const nameNode = node.name;
    
    // Get the name of the JSX element (e.g., div, span, etc.)
    let tagName = '';
    if (nameNode.type === 'JSXIdentifier') {
      tagName = nameNode.name;
    } else if (nameNode.type === 'JSXMemberExpression') {
      tagName = nameNode.property.name;
    }

    if (excludedTags.includes(tagName)) {
      return;
    }

    // Check if it has an onClick attribute
    const hasOnClick = node.attributes.some(attr => 
      attr.type === 'JSXAttribute' && attr.name.name === 'onClick'
    );

    if (hasOnClick) {
      // Check for className
      let classNameAttr = node.attributes.find(attr => 
        attr.type === 'JSXAttribute' && attr.name.name === 'className'
      );

      if (classNameAttr) {
        // If className is a string literal
        if (classNameAttr.value.type === 'StringLiteral' || classNameAttr.value.type === 'Literal') {
          if (!classNameAttr.value.value.includes('cursor-pointer')) {
            classNameAttr.value.value = classNameAttr.value.value + ' cursor-pointer';
            dirty = true;
          }
        } 
        // If className is an expression (e.g., clsx(...), `foo ${bar}`)
        else if (classNameAttr.value.type === 'JSXExpressionContainer') {
          const expression = classNameAttr.value.expression;
          if (expression.type === 'TemplateLiteral') {
            const lastQuasi = expression.quasis[expression.quasis.length - 1];
            if (!lastQuasi.value.raw.includes('cursor-pointer')) {
              lastQuasi.value.raw += ' cursor-pointer';
              lastQuasi.value.cooked += ' cursor-pointer';
              dirty = true;
            }
          }
          // We could handle other cases like logical expressions or function calls, 
          // but that can be complex. We'll stick to string/template literals for now.
        }
      } else {
        // No className, add one
        node.attributes.push(
          j.jsxAttribute(
            j.jsxIdentifier('className'),
            j.literal('cursor-pointer')
          )
        );
        dirty = true;
      }
    }
  });

  return dirty ? root.toSource() : null;
};
