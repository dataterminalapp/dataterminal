export interface APIResponse<T, E extends Error> {
  data?: T;
  error?: E;
}
