"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone_number: string | null;
  location: string | null;
  website: string | null;
  date_of_birth: string | null;
  gender: string | null;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Profile>();

  useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true);
        setError(null);

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!sessionData.session) {
          router.push("/auth/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setValue("username", data.username || "");
          setValue("email", data.email || "");
          setValue("full_name", data.full_name || "");
          setValue("bio", data.bio || "");
          setValue("phone_number", data.phone_number || "");
          setValue("location", data.location || "");
          setValue("website", data.website || "");
          setValue("date_of_birth", data.date_of_birth || "");
          setValue("gender", data.gender || "");
          setAvatarUrl(data.avatar_url);
        }
      } catch (error: any) {
        console.error("Error loading profile:", error);
        setError(error.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [supabase, router, setValue]);

  const onSubmit = async (formData: Profile) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/auth/login");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          full_name: formData.full_name,
          bio: formData.bio,
          phone_number: formData.phone_number,
          location: formData.location,
          website: formData.website,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionData.session.user.id);

      if (error) {
        throw error;
      }

      setSuccess("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setError(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      setUploading(true);
      setError(null);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `avatars/${crypto.randomUUID()}.${fileExt}`;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/auth/login");
        return;
      }

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = data.publicUrl;

      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", sessionData.session.user.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(avatarUrl);
      setSuccess("Avatar updated successfully");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      setError(error.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow-md dark:bg-dark-bg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Your Profile</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Manage your personal information
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/30">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/30">
            <p className="text-sm text-green-700 dark:text-green-200">
              {success}
            </p>
          </div>
        )}

        <div className="flex flex-col items-center space-y-4">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gray-200">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-2xl font-bold text-primary">
                {loading ? "..." : "?"}
              </div>
            )}
          </div>
          <label className="cursor-pointer rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            {uploading ? "Uploading..." : "Change Avatar"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={uploading}
            />
          </label>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                {...register("username", {
                  required: "Username is required",
                  minLength: {
                    value: 3,
                    message: "Username must be at least 3 characters",
                  },
                })}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700"
                disabled
                {...register("email")}
              />
            </div>

            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                {...register("full_name")}
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Bio
              </label>
              <textarea
                id="bio"
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                {...register("bio")}
              />
            </div>

            <div>
              <label
                htmlFor="phone_number"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Phone Number
              </label>
              <input
                id="phone_number"
                type="tel"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                {...register("phone_number")}
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Location
              </label>
              <input
                id="location"
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                {...register("location")}
              />
            </div>

            <div>
              <label
                htmlFor="website"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Website
              </label>
              <input
                id="website"
                type="url"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                {...register("website")}
              />
            </div>

            <div>
              <label
                htmlFor="date_of_birth"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Date of Birth
              </label>
              <input
                id="date_of_birth"
                type="date"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                {...register("date_of_birth")}
              />
            </div>

            <div>
              <label
                htmlFor="gender"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Gender
              </label>
              <select
                id="gender"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                {...register("gender")}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex justify-center rounded-md bg-primary px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
