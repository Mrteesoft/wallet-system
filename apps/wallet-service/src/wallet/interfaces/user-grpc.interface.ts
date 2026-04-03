import { Observable } from 'rxjs';

export interface UserGrpcResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserServiceGrpc {
  getUserById(data: { id: string }): Observable<UserGrpcResponse>;
}
