declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.css';
declare module '*.scss';

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module 'maplibre-gl/dist/maplibre-gl.css';

interface Window {
  alcolockDesktop?: {
    openOperatorChatPopup(payload: {
      url: string;
      lock: {
        outerW: number;
        outerH: number;
        left: number;
        top: number;
      };
    }): Promise<void>;
    closeCurrentWindow(): Promise<void>;
    closeOperatorChatPopup(): Promise<void>;
  };
}
