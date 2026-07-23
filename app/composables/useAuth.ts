interface AuthUser {
  id: string
  name: string
  email: string
  photo: string | null
  created_at: string
}

interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

interface SingleResponse<T> {
  message: string
  data: T
}

interface LoginResponse extends SingleResponse<AuthUser> {
  token: string
}

export const useAuth = () => {
  const api = useApi()

  const token = useCookie<string | null>('auth_token', {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
  })

  const user = useState<AuthUser | null>('auth_user', () => null)

  const login = async (email: string, password: string) => {
    const response = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    token.value = response.token
    user.value = response.data

    return response
  }

  const register = async (payload: RegisterPayload) => {
    const response = await api<SingleResponse<AuthUser>>('/auth/register', {
      method: 'POST',
      body: payload,
    })
    return response
  }

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      token.value = null
      user.value = null
    }
  }

  const fetchUser = async () => {
    const response = await api<SingleResponse<AuthUser>>('/auth/me')
    user.value = response.data
    return response.data
  }

  const isAuthenticated = computed(() => !!token.value)

  return {
    user,
    token,
    login,
    register,
    logout,
    fetchUser,
    isAuthenticated,
  }
}