import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';

interface HtmlRendererProps {
  html: string;
  style?: any;
}

interface ParsedNode {
  type: 'text' | 'tag';
  tag?: string;
  attrs?: Record<string, string>;
  children?: ParsedNode[];
  text?: string;
}

const parseHtml = (html: string): ParsedNode[] => {
  const nodes: ParsedNode[] = [];
  let remaining = html;

  while (remaining.length > 0) {
    const tagMatch = remaining.match(/^<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>([\s\S]*?)<\/\1>/);
    const selfClosingMatch = remaining.match(/^<(br|hr|img)([^>]*)\/?>/i);
    const textMatch = remaining.match(/^[^<]+/);

    if (tagMatch) {
      const [, tag, attrsStr, inner] = tagMatch;
      const attrs: Record<string, string> = {};
      const attrRegex = /(\w+)=["']([^"']*)["']/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }
      nodes.push({
        type: 'tag',
        tag: tag.toLowerCase(),
        attrs,
        children: parseHtml(inner),
      });
      remaining = remaining.slice(tagMatch[0].length);
    } else if (selfClosingMatch) {
      const [, tag, attrsStr] = selfClosingMatch;
      const attrs: Record<string, string> = {};
      const attrRegex = /(\w+)=["']([^"']*)["']/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }
      nodes.push({ type: 'tag', tag: tag.toLowerCase(), attrs });
      remaining = remaining.slice(selfClosingMatch[0].length);
    } else if (textMatch) {
      nodes.push({ type: 'text', text: textMatch[0] });
      remaining = remaining.slice(textMatch[0].length);
    } else {
      remaining = remaining.slice(1);
    }
  }

  return nodes;
};

const renderNode = (node: ParsedNode, index: number): React.ReactNode => {
  if (node.type === 'text') {
    return <Text key={index}>{node.text}</Text>;
  }

  const tag = node.tag;
  const children = node.children?.map((child, i) => renderNode(child, i));

  switch (tag) {
    case 'b':
    case 'strong':
      return <Text key={index} style={styles.bold}>{children}</Text>;
    case 'i':
    case 'em':
      return <Text key={index} style={styles.italic}>{children}</Text>;
    case 'u':
      return <Text key={index} style={styles.underline}>{children}</Text>;
    case 'a':
      const href = node.attrs?.href || '';
      return (
        <TouchableOpacity key={index} onPress={() => href && Linking.openURL(href)}>
          <Text style={styles.link}>{children}</Text>
        </TouchableOpacity>
      );
    case 'br':
      return <Text key={index}>{'\n'}</Text>;
    case 'p':
      return <Text key={index} style={styles.paragraph}>{children}</Text>;
    case 'h1':
    case 'h2':
    case 'h3':
      return <Text key={index} style={styles.heading}>{children}</Text>;
    case 'ul':
      return <View key={index} style={styles.list}>{children}</View>;
    case 'li':
      return <Text key={index} style={styles.listItem}>• {children}</Text>;
    case 'div':
      return <View key={index}>{children}</View>;
    default:
      return <Text key={index}>{children}</Text>;
  }
};

export const HtmlRenderer = ({ html, style }: HtmlRendererProps) => {
  const nodes = parseHtml(html || '');
  return (
    <View style={[styles.container, style]}>
      {nodes.map((node, index) => renderNode(node, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexWrap: 'wrap',
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  link: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  paragraph: {
    marginBottom: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  list: {
    marginLeft: 16,
    marginBottom: 8,
  },
  listItem: {
    marginBottom: 4,
  },
});

export default HtmlRenderer;
