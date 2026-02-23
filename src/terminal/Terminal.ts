import command from '../../config.json' assert { type: 'json' };
import { HELP } from '../commands/help';
import { BANNER } from '../commands/banner';
import { ABOUT } from '../commands/about';
import { DEFAULT } from '../commands/default';
import { PROJECTS } from '../commands/projects';
import { createWhoami } from '../commands/whoami';
import type { WindowContent } from '../types';

export class Terminal implements WindowContent {
  private container!: HTMLElement;
  private mutWriteLines!: Element;
  private writeLinesCopy!: Element;
  private termOutput!: HTMLElement;
  private userInputEl!: HTMLInputElement;
  private inputHidden!: HTMLElement;
  private passwordInputEl!: HTMLElement;
  private passwordField!: HTMLInputElement;

  private historyIdx = 0;
  private tempInput = '';
  private userInput = '';
  private isSudo = false;
  private isPasswordInput = false;
  private passwordCounter = 0;
  private bareMode = false;
  private readonly history: string[] = [];

  private readonly COMMANDS = ['help', 'about', 'projects', 'whoami', 'repo', 'banner', 'clear'];

  private boundKeyHandler!: (e: KeyboardEvent) => void;
  private boundClickHandler!: () => void;

  private render(): string {
    return `
      <div class="term-output">
        <div>
          <span class="term-prompt">
            <span class="term-pre-user"></span>@<span class="term-pre-host"></span>:$ ~&nbsp;
          </span>
        </div>
        <a class="term-write-lines"></a>
      </div>
      <div class="term-input-line">
        <div>
          <p class="term-password-input" style="display: none;">
            Password: <input class="term-password-field" autocomplete="off" type="password" />
          </p>
          <p class="term-input-hidden">
            <span class="term-prompt">
              <span class="term-user"></span>@<span class="term-host"></span>:$ ~&nbsp;
            </span>
            <input class="term-user-input" type="text" enterkeyhint="Enter"
                   spellcheck="false" autocapitalize="none" autocomplete="off" />
          </p>
        </div>
        <br>
      </div>
    `;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = this.render();

    this.termOutput = container.querySelector('.term-output') as HTMLElement;
    this.mutWriteLines = container.querySelector('.term-write-lines')!;
    this.writeLinesCopy = this.mutWriteLines;
    this.userInputEl = container.querySelector('.term-user-input') as HTMLInputElement;
    this.inputHidden = container.querySelector('.term-input-hidden') as HTMLElement;
    this.passwordInputEl = container.querySelector('.term-password-input') as HTMLElement;
    this.passwordField = container.querySelector('.term-password-field') as HTMLInputElement;

    const preHost = container.querySelector('.term-pre-host');
    const preUser = container.querySelector('.term-pre-user');
    const host = container.querySelector('.term-host');
    const user = container.querySelector('.term-user');

    if (preHost) preHost.textContent = command.hostname;
    if (preUser) preUser.textContent = command.username;
    if (host) host.textContent = command.hostname;
    if (user) user.textContent = command.username;

    this.boundKeyHandler = this.userInputHandler.bind(this);
    this.boundClickHandler = () => this.userInputEl.focus();

    this.userInputEl.addEventListener('keypress', this.boundKeyHandler);
    this.userInputEl.addEventListener('keydown', this.boundKeyHandler);
    this.passwordField.addEventListener('keypress', this.boundKeyHandler);
    this.container.addEventListener('click', this.boundClickHandler);

    this.writeLines(BANNER);
    setTimeout(() => this.userInputEl.focus(), 100);

    console.log(`%cPassword: ${command.password}`, 'color: red; font-size: 20px;');
  }

  destroy(): void {
    this.userInputEl.removeEventListener('keypress', this.boundKeyHandler);
    this.userInputEl.removeEventListener('keydown', this.boundKeyHandler);
    this.passwordField.removeEventListener('keypress', this.boundKeyHandler);
    this.container.removeEventListener('click', this.boundClickHandler);
  }

  private scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }

  private userInputHandler(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (!this.isPasswordInput) {
          this.enterKey();
        } else {
          this.passwordHandler();
        }
        this.scrollToBottom();
        break;
      case 'Escape':
        this.userInputEl.value = '';
        break;
      case 'ArrowUp':
        this.arrowKeys(e.key);
        e.preventDefault();
        break;
      case 'ArrowDown':
        this.arrowKeys(e.key);
        break;
      case 'Tab':
        this.tabKey();
        e.preventDefault();
        break;
    }
  }

  private enterKey(): void {
    const resetInput = '';
    this.userInput = this.userInputEl.value;

    const promptEl = this.inputHidden.querySelector('.term-prompt');
    const promptHTML = promptEl ? promptEl.outerHTML : '';

    const newUserInput = this.bareMode
      ? this.userInput
      : `<span class='output'>${this.userInput}</span>`;

    this.history.push(this.userInput);
    this.historyIdx = this.history.length;

    if (this.userInput === 'clear') {
      this.commandHandler(this.userInput.toLowerCase().trim());
      this.userInputEl.value = resetInput;
      this.userInput = resetInput;
      return;
    }

    const div = document.createElement('div');
    div.innerHTML = `${promptHTML} ${newUserInput}`;

    if (this.mutWriteLines.parentNode) {
      this.mutWriteLines.parentNode.insertBefore(div, this.mutWriteLines);
    }

    if (this.userInput.trim().length !== 0) {
      this.commandHandler(this.userInput.toLowerCase().trim());
    }

    this.userInputEl.value = resetInput;
    this.userInput = resetInput;
  }

  private tabKey(): void {
    const currInput = this.userInputEl.value;
    for (const cmd of this.COMMANDS) {
      if (cmd.startsWith(currInput)) {
        this.userInputEl.value = cmd;
        return;
      }
    }
  }

  private arrowKeys(key: string): void {
    switch (key) {
      case 'ArrowDown':
        if (this.historyIdx !== this.history.length) {
          this.historyIdx += 1;
          this.userInputEl.value = this.history[this.historyIdx] ?? this.tempInput;
          if (this.historyIdx === this.history.length) this.userInputEl.value = this.tempInput;
        }
        break;
      case 'ArrowUp':
        if (this.historyIdx === this.history.length) this.tempInput = this.userInputEl.value;
        if (this.historyIdx !== 0) {
          this.historyIdx -= 1;
          this.userInputEl.value = this.history[this.historyIdx] ?? '';
        }
        break;
    }
  }

  private commandHandler(input: string): void {
    if (input.startsWith('rm -rf') && input.trim() !== 'rm -rf') {
      if (this.isSudo) {
        if (input === 'rm -rf src' && !this.bareMode) {
          this.bareMode = true;
          setTimeout(() => {
            this.termOutput.innerHTML = '';
            this.termOutput.appendChild(this.writeLinesCopy);
            this.mutWriteLines = this.writeLinesCopy;
          });
          this.easterEggStyles();
          setTimeout(() => { this.writeLines(['What made you think that was a good idea?', '<br>']); }, 200);
          setTimeout(() => { this.writeLines(['Now everything is ruined.', '<br>']); }, 1200);
        } else if (input === 'rm -rf src' && this.bareMode) {
          this.writeLines(["there's no more src folder.", '<br>']);
        } else {
          if (this.bareMode) {
            this.writeLines(['What else are you trying to delete?', '<br>']);
          } else {
            this.writeLines(['<br>', 'Directory not found.', "type <span class='command'>'ls'</span> for a list of directories.", '<br>']);
          }
        }
      } else {
        this.writeLines(['Permission not granted.', '<br>']);
      }
      return;
    }

    switch (input) {
      case 'clear':
        setTimeout(() => {
          this.termOutput.innerHTML = '';
          this.termOutput.appendChild(this.writeLinesCopy);
          this.mutWriteLines = this.writeLinesCopy;
        });
        break;
      case 'banner':
        if (this.bareMode) { this.writeLines(['WebShell v1.0.0', '<br>']); break; }
        this.writeLines(BANNER);
        break;
      case 'help':
        if (this.bareMode) { this.writeLines(['maybe restarting your browser will fix this.', '<br>']); break; }
        this.writeLines(HELP);
        break;
      case 'whoami':
        if (this.bareMode) { this.writeLines([`${command.username}`, '<br>']); break; }
        this.writeLines(createWhoami());
        break;
      case 'about':
        if (this.bareMode) { this.writeLines(['Nothing to see here.', '<br>']); break; }
        this.writeLines(ABOUT);
        break;
      case 'projects':
        if (this.bareMode) { this.writeLines(["I don't want you to break the other projects.", '<br>']); break; }
        this.writeLines(PROJECTS);
        break;
      case 'repo':
        this.writeLines(['Redirecting to github.com...', '<br>']);
        setTimeout(() => { window.open(command.repoLink, '_blank'); }, 500);
        break;
      case 'linkedin':
        break;
      case 'github':
        break;
      case 'email':
        break;
      case 'rm -rf':
        if (this.bareMode) { this.writeLines(["don't try again.", '<br>']); break; }
        if (this.isSudo) {
          this.writeLines(["Usage: <span class='command'>'rm -rf &lt;dir&gt;'</span>", '<br>']);
        } else {
          this.writeLines(['Permission not granted.', '<br>']);
        }
        break;
      case 'sudo':
        if (this.bareMode) { this.writeLines(['no.', '<br>']); break; }
        this.isPasswordInput = true;
        this.userInputEl.disabled = true;
        this.inputHidden.style.display = 'none';
        this.passwordInputEl.style.display = 'block';
        setTimeout(() => { this.passwordField.focus(); }, 100);
        break;
      case 'ls':
        if (this.bareMode) { this.writeLines(['', '<br>']); break; }
        if (this.isSudo) {
          this.writeLines(['src', '<br>']);
        } else {
          this.writeLines(['Permission not granted.', '<br>']);
        }
        break;
      default:
        if (this.bareMode) { this.writeLines(["type 'help'", '<br>']); break; }
        this.writeLines(DEFAULT);
        break;
    }
  }

  private writeLines(message: string[]): void {
    message.forEach((item, idx) => { this.displayText(item, idx); });
  }

  private displayText(item: string, idx: number): void {
    setTimeout(() => {
      const p = document.createElement('p');
      p.innerHTML = item;
      this.mutWriteLines.parentNode!.insertBefore(p, this.mutWriteLines);
      this.scrollToBottom();
    }, 40 * idx);
  }

  private revertPasswordChanges(): void {
    this.passwordField.value = '';
    this.userInputEl.disabled = false;
    this.inputHidden.style.display = 'block';
    this.passwordInputEl.style.display = 'none';
    this.isPasswordInput = false;
    setTimeout(() => { this.userInputEl.focus(); }, 200);
  }

  private passwordHandler(): void {
    if (this.passwordCounter === 2) {
      this.writeLines(['<br>', 'INCORRECT PASSWORD.', 'PERMISSION NOT GRANTED.', '<br>']);
      this.revertPasswordChanges();
      this.passwordCounter = 0;
      return;
    }
    if (this.passwordField.value === command.password) {
      this.writeLines(['<br>', 'PERMISSION GRANTED.', "Try <span class='command'>'rm -rf'</span>", '<br>']);
      this.revertPasswordChanges();
      this.isSudo = true;
    } else {
      this.passwordField.value = '';
      this.passwordCounter++;
    }
  }

  private easterEggStyles(): void {
    const windowEl = this.container.closest('.window') as HTMLElement | null;
    if (windowEl) {
      const titlebar = windowEl.querySelector('.window-titlebar') as HTMLElement | null;
      const decoBars = windowEl.querySelectorAll<HTMLElement>('.window-deco-bar');
      if (titlebar) titlebar.style.display = 'none';
      decoBars.forEach(bar => { bar.style.display = 'none'; });
      windowEl.style.border = 'none';
      windowEl.style.boxShadow = 'none';
    }

    this.container.style.backgroundColor = 'black';
    this.container.style.fontFamily = 'VT323, monospace';
    this.container.style.fontSize = '20px';
    this.container.style.color = 'white';

    this.container.querySelectorAll<HTMLElement>('span').forEach(span => {
      span.style.color = 'white';
    });

    this.userInputEl.style.backgroundColor = 'black';
    this.userInputEl.style.color = 'white';
    this.userInputEl.style.fontFamily = 'VT323, monospace';
    this.userInputEl.style.fontSize = '20px';
  }
}
