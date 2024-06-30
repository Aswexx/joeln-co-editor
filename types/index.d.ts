export { Order }

declare global {

  interface Order {
    orderNo: string,
    title: string,
    belongsTo: 'follows' | 'payments' | 'newNeeds' | 'bets',
    done: boolean,
    marked: boolean
  }

}