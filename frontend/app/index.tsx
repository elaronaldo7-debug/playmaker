import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import Loading from "@/components/Loading";

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <Loading label="Loading Playmaker FC..." />;
  }

  return <Redirect href={isAuthenticated ? "/dashboard" : "/login"} />;
}
