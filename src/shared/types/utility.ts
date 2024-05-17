export type ExtractTypeFromArray<T> = T extends (infer U)[] ? U : never;
export interface MySelectDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  'data-testid'?: string;
}
