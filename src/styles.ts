import command from '../config.json' assert { type: 'json' };

(() => {
  const style = document.createElement('style');
  const head = document.head;

  const background = `body {background: ${command.colors.background}}`;
  const foreground = `body {color: ${command.colors.foreground}}`;
  const inputBackground = `input {background: ${command.colors.background}}`;
  const inputForeground = `input {color: ${command.colors.prompt.input}}`;
  const outputColor = `.output {color: ${command.colors.prompt.input}}`;
  const preHost = `.term-pre-host {color: ${command.colors.prompt.host}}`;
  const host = `.term-host {color: ${command.colors.prompt.host}}`;
  const preUser = `.term-pre-user {color: ${command.colors.prompt.user}}`;
  const user = `.term-user {color: ${command.colors.prompt.user}}`;
  const prompt = `.term-prompt {color: ${command.colors.prompt.default}}`;
  const banner = `pre {color: ${command.colors.banner}}`;
  const link = `a {color: ${command.colors.link.text}}`;
  const linkHighlight = `a:hover {background: ${command.colors.link.highlightColor}}`;
  const linkTextHighlight = `a:hover {color: ${command.colors.link.highlightText}}`;
  const commandHighlight = `.command {color: ${command.colors.commands.textColor}}`;
  const keys = `.keys {color: ${command.colors.banner}}`;

  if (!command.colors.border.visible) {
    const noWindowBorder = `.window {border: none}`;
    style.textContent = noWindowBorder;
  }

  head.appendChild(style);
  if (!style.sheet) return;

  style.sheet.insertRule(background);
  style.sheet.insertRule(foreground);
  style.sheet.insertRule(inputBackground);
  style.sheet.insertRule(inputForeground);
  style.sheet.insertRule(outputColor);
  style.sheet.insertRule(preHost);
  style.sheet.insertRule(host);
  style.sheet.insertRule(preUser);
  style.sheet.insertRule(user);
  style.sheet.insertRule(prompt);
  style.sheet.insertRule(banner);
  style.sheet.insertRule(link);
  style.sheet.insertRule(linkHighlight);
  style.sheet.insertRule(linkTextHighlight);
  style.sheet.insertRule(commandHighlight);
  style.sheet.insertRule(keys);
})();
