import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { LoaderComponent } from '../common/cmp/loader/loader.component';
import { Socket, io } from 'socket.io-client';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { Clipboard } from '@angular/cdk/clipboard';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface BoardPosition {
  pos: string;
}

@Component({
  selector: 'app-create-room',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    FormsModule,
    FontAwesomeModule,
    HttpClientModule,
  ],
  templateUrl: './create-room.component.html',
  styleUrl: './create-room.component.scss',
})
export class CreateRoomComponent implements OnInit, OnDestroy {
  private socket!: Socket;
  public roomId: string = '';
  public isLoading: boolean = false;
  public isJoiningRoom: boolean = false;
  public isCreatingRoom: boolean = false;
  public joiningRoomCode!: string;
  public loadMainBoard: boolean = false;
  public gameBoard: BoardPosition[] = [
    { pos: '' },
    { pos: '' },
    { pos: '' },
    { pos: '' },
    { pos: '' },
    { pos: '' },
    { pos: '' },
    { pos: '' },
    { pos: '' },
  ];
  private gamePos: string[] = ['', '', '', '', '', '', '', '', ''];
  public isGameOver: boolean = false;
  public currentPlayer: string = 'X';
  public currentUser: string = '';
  public userId: string | undefined = '';
  private currentIndex = 0;
  private userRoom: [] = [];
  public winText: string = '';
  public disabledReplayButton: boolean = false;
  faCopy = faCopy;

  constructor(private clipboard: Clipboard) {
    this.socket = io(environment.serverURL, {
      transports: ['websocket', 'polling', 'flashsocket'],
      reconnectionDelayMax: 10000,
    });
  }

  ngOnInit() {
    this.socket.on('gameStart', (data) => {
      this.resetGame();
      this.loadMainBoard = true;
      this.userId = this.socket.id;
      sessionStorage.setItem('roomId', data.roomId);
      this.roomId = data.roomId;
      this.userRoom = data.users;
      this.currentUser = this.userRoom[this.currentIndex];
    });
    this.socket.on('roomCreated', (roomId) => {
      this.isLoading = false;
      this.roomId = roomId;
    });
    this.socket.on('boardData', (data) => {
      this.gameBoard[data.number].pos = data.currentPlayer;
      this.gamePos[data.number] = data.currentPlayer;
      const check = this.check();
      switch (check) {
        case 'win':
          this.winText =
            this.currentUser === this.userId ? 'You Wins!!!' : 'You Lose!!!';
          break;
        case 'tie':
          this.winText = "It's a tie!";
          break;
        default:
          this.currentPlayer = data.currentPlayer === 'X' ? 'O' : 'X';
          this.currentIndex = this.currentIndex ? 0 : 1;
          this.currentUser = this.userRoom[this.currentIndex];
          break;
      }
    });
    this.socket.on('restartGame', (roomId) => {
      this.resetGame(false);
    });
    this.socket.on('leftGame', () => {
      this.winText = 'Other Player Left the game!!!';
    });
    this.socket.on('userLeft', () => {
      this.isGameOver = true;
      this.winText = 'Other Player Left the game!!!';
      this.disabledReplayButton = true;
    });
  }

  onCreateRoom(): void {
    if (this.socket.connected) {
      this.isJoiningRoom = false;
      this.isCreatingRoom = true;
      this.isLoading = true;
      this.socket.emit('createRoom');
    }
  }

  onJoinRoom(): void {
    if (this.socket.connected) {
      this.isJoiningRoom = true;
      this.isCreatingRoom = false;
    }
  }

  onCopyRoomCode(): void {
    if (this.roomId) {
      this.clipboard.copy(this.roomId);
    }
  }

  onEnteringRoom(): void {
    if (this.socket.connected) {
      this.socket.emit('joinRoom', this.joiningRoomCode);
    }
  }

  onCellClick(number: number): void {
    if (!this.isGameOver && this.gameBoard[number].pos === '') {
      this.socket.emit('boardClick', {
        roomId: this.roomId,
        currentPlayer: this.currentPlayer,
        number,
      });
      this.gameBoard[number].pos = this.currentPlayer;
      this.gamePos[number] = this.currentPlayer;
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }
  }

  check() {
    const winPatterns = [
      [0, 1, 2],
      [0, 3, 6],
      [0, 4, 8],
      [1, 4, 7],
      [2, 4, 6],
      [2, 5, 8],
      [3, 4, 5],
      [6, 7, 8],
    ];
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (
        this.gamePos[a] &&
        this.gamePos[a] === this.gamePos[b] &&
        this.gamePos[a] === this.gamePos[c]
      ) {
        this.isGameOver = true;
        return 'win';
      }
    }
    if (!this.gamePos.includes('')) {
      this.isGameOver = true;
      return 'tie';
    }
    return 'continue';
  }

  resetGame(defaultValue = true): void {
    this.gameBoard = [
      { pos: '' },
      { pos: '' },
      { pos: '' },
      { pos: '' },
      { pos: '' },
      { pos: '' },
      { pos: '' },
      { pos: '' },
      { pos: '' },
    ];
    this.gamePos = ['', '', '', '', '', '', '', '', ''];
    this.currentPlayer = 'X';
    this.isGameOver = false;
    this.winText = '';
    this.currentIndex = 0;
    if (defaultValue) {
      this.socket.emit('reset', { roomId: this.roomId });
    }
  }

  onNavigateHome(): void {
    this.socket.emit('userLeft', { roomId: this.roomId });
    this.roomId = '';
    this.isLoading = false;
    this.isJoiningRoom = false;
    this.isCreatingRoom = false;
    this.joiningRoomCode = '';
    this.loadMainBoard = false;
    sessionStorage.clear();
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
    sessionStorage.clear();
  }
}
