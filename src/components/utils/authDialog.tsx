import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { authLoaded, requiresAuthDialogClosed } from "@/features/global";
import { useCallback } from "react";
import { LockIcon, InfoIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Auth as AuthStructure } from "@/services/auth";
import { APIResponse } from "@/services/types";
import { APIErrorJSON } from "@/services/error";

const Auth = () => {
  /**
   * Providers
   */
  const dispatch = useAppDispatch();

  /**
   * Selectors
   */
  const requiresAuth = useAppSelector((state) => state.global.requiresAuth);

  /**
   * Callbacks
   */
  const onOpenChange = useCallback((open: boolean) => {
    if (!open) {
      dispatch(requiresAuthDialogClosed());
    }
  }, []);

  const onLoginClick = useCallback(() => {
    const asyncOp = async () => {
      try {
        const { data }: APIResponse<AuthStructure, APIErrorJSON> = await (
          window as Window
        ).electronAPI.login();

        if (data) {
          dispatch(authLoaded({ auth: data }));
          dispatch(requiresAuthDialogClosed());
        }
      } catch (err) {
        console.error(err);
      }
    };

    asyncOp();
  }, []);

  return (
    <Dialog open={!!requiresAuth} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900">
            <LockIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <DialogTitle className="text-center text-xl font-semibold">
            Sign up to continue
          </DialogTitle>
          <DialogDescription className="text-left">
            Authenticate to access advanced AI coding assistance in Data
            Terminal. Create an account or sign in to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start space-x-3 rounded-md border p-3">
            <InfoIcon className="size-5 text-muted-foreground mt-0.5 stroke-1" />
            <div>
              <h4 className="font-medium">Private and secure</h4>
              <p className="text-muted-foreground">
                Your connection credentials stay on your machine—we never store
                or access them.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-2">
          <Button
            variant="ghost"
            onClick={onLoginClick}
            className="w-full sm:w-auto"
          >
            Sign in
          </Button>
          <Button
            variant={"primary"}
            className="w-full sm:w-auto"
            onClick={onLoginClick}
          >
            Sign up now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Auth;
