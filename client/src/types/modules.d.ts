declare module '*.jsx' {
  const component: any;
  export default component;
}

declare module '*.js' {
  const module: any;
  export default module;
  export const configureStore: any;
  export const fetchCurrentUser: any;
  export const logoutUser: any;
}
