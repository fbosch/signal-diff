export interface UserContract {
  id: string
}

export class UserService {
  cache = new Map<string, string>()

  renderRow(user: UserContract) {
    return <div>{user.id}</div>
  }
}

export const UserView = () => <section>bench</section>
