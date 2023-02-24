import { NearBindgen, near, call, view, Vector, NearPromise } from 'near-sdk-js';
import { POINT_ONE, PostedMessage } from './model';

@NearBindgen({})
class GuestBook {
  messages: Vector<PostedMessage> = new Vector<PostedMessage>('v-uid');
  @call({ payableFunction: true })
  // Public - Adds a new message.
  add_message({
    user,
    hours,
    days,
    lastTime,
  }: {
    user: string;
    hours: number;
    days: number;
    lastTime: string;
  }) {
    let proverka = true;
    const sender = near.predecessorAccountId();
    this.messages.toArray().forEach((itemUser) => {
      if (itemUser.sender == sender && itemUser.readProcess == 'reading') {
        proverka = false;
      }
    });
    if (proverka) {
      const bet: bigint = near.attachedDeposit() as bigint;
      const readProcess = 'reading';
      const deadline = near.blockTimestamp() + BigInt(days * 86_400_000_000_000);
      const timer = BigInt(0);

      const message: PostedMessage = {
        sender,
        user,
        days,
        bet,
        hours,
        deadline,
        lastTime,
        readProcess,
        timer,
      };
      this.messages.push(message);
    }
  }

  @call({})
  accountName() {
    const user = near.predecessorAccountId();
    return user.toString();
  }

  @view({})
  getUser(user) {
    let res = {};
    if (this.messages.length) {
      this.messages.toArray().forEach((item, index) => {
        if (item.sender == user.user && item.readProcess == 'reading') {
          res = item;
        }
      });
    }
    return res;
  }

  @call({})
  timer() {
    const user = near.predecessorAccountId();
    const nowTime = near.blockTimestamp();
    this.messages.toArray().forEach((userItem, index) => {
      if (userItem.sender == user && userItem.readProcess == 'reading') {
        if (userItem.timer < BigInt(userItem.hours * 60_000_000_000)) {
          if (BigInt(userItem.lastTime) - nowTime > BigInt(-120_000_000_000)) {
            userItem.timer += nowTime - BigInt(userItem.lastTime);
            userItem.lastTime = nowTime.toString();
            this.messages.replace(index, userItem);
          } else {
            userItem.lastTime = nowTime.toString();
            this.messages.replace(index, userItem);
          }
        } else {
          userItem.readProcess = 'Win';
          userItem.lastTime = nowTime.toString();
          this.messages.replace(index, userItem);
          const promise = near.promiseBatchCreate(userItem.sender);
          near.promiseBatchActionTransfer(promise, userItem.bet);
        }
      }
    });
  }

  @call({})
  loseMoney() {
    const now = near.blockTimestamp();
    this.messages.toArray().forEach((userItem, index) => {
      if (userItem.deadline < now) {
        const promise = near.promiseBatchCreate('book-jack.near');
        near.promiseBatchActionTransfer(promise, userItem.bet);
        userItem.readProcess = 'fail';
        this.messages.replace(index, userItem);
      }
    });
  }
}
