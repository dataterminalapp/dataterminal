import { useCallback } from "react";
import { Button } from "../../ui/button";

import Logo from "../../utils/logo";
import { Auth } from "@/services/auth";
import { APIResponse } from "@/services/types";
import { APIErrorJSON } from "@/services/error";

interface Props {
  onLogin: (auth: Auth) => void;
}

const Login = ({ onLogin }: Props) => {
  const onLoginClick = useCallback(() => {
    const asyncOp = async () => {
      try {
        const { data }: APIResponse<Auth, APIErrorJSON> = await (
          window as Window
        ).electronAPI.login();

        if (data) {
          onLogin(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    asyncOp();
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      <div className="p-8 text-base font-semibold">
        <Logo />
      </div>
      <div className="m-auto text-center flex flex-col pb-52">
        <h1 className="text-4xl">
          Log in or <br />
          create an account
        </h1>
        <Button
          onClick={onLoginClick}
          className="mt-4 py-5 text-lg font-semibold"
        >
          Log in with browser
        </Button>
        <p className="mt-2 text-muted-foreground">
          No account?{" "}
          <a
            onClick={onLoginClick}
            className="cursor-pointer hover:underline text-blue-400"
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
