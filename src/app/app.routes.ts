import { Routes } from '@angular/router';
import { CreateRoomComponent } from './create-room/create-room.component';

export const routes: Routes = [
  {
    path: 'tic-tae-toe',
    component: CreateRoomComponent,
  },
  {
    path: '**',
    redirectTo: '/tic-tae-toe',
    pathMatch: 'full',
  },
];
