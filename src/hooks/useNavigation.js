import { useState, useCallback } from "react";

export function useNavigation(initialScreen = "camera") {
  const [screen, setScreen] = useState(initialScreen);
  const [prevScreens, setPrevScreens] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);

  const go = useCallback((to) => {
    setPrevScreens(p => [...p, screen]);
    setScreen(to);
  }, [screen]);

  const goBack = useCallback(() => {
    const prev = [...prevScreens];
    const last = prev.pop() || initialScreen;
    setPrevScreens(prev);
    setReviewMode(false);
    setScreen(last);
  }, [prevScreens, initialScreen]);

  const goTo = useCallback((to) => {
    setPrevScreens([]);
    setReviewMode(false);
    setScreen(to);
  }, []);

  return { screen, setScreen, prevScreens, setPrevScreens, reviewMode, setReviewMode, go, goBack, goTo };
}
