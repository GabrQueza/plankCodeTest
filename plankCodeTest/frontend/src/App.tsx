import "./App.css";
import { useState } from "react";
import React from "react";
import axios from "axios";

import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Input,
  SimpleGrid,
  Text,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Card,
  CardBody,
  Divider,
  useToast,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface SummaryData {
  user_id: number;
  total_actions: number;
  most_frequent_action: string | null;
  avg_duration: number;
  most_frequent_page: string | null;
}

interface TrendData {
  user_id: number;
  action: string;
  count: number;
}

const Dashboard = () => {
  const toast = useToast();
  const API_URL = "http://localhost:3000";

  // --- ESTADOS ---
  const [userId, setUserId] = useState("");
  const [summaryStart, setSummaryStart] = useState("");
  const [summaryEnd, setSummaryEnd] = useState("");
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [trendStart, setTrendStart] = useState("");
  const [trendEnd, setTrendEnd] = useState("");
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);

  // --- FETCH SUMMARY ---
  const fetchSummary = async () => {
    if (!userId || !summaryStart || !summaryEnd) {
      toast({
        title: "Preencha todos os campos do resumo.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setLoadingSummary(true);
    try {
      const response = await axios.get<SummaryData>(`${API_URL}/summary`, {
        params: {
          user_id: userId,
          start_time: new Date(summaryStart).toISOString(),
          end_time: new Date(summaryEnd).toISOString(),
        },
      });
      setSummaryData(response.data);
    } catch (error) {
      toast({
        title: "Erro ao buscar resumo.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingSummary(false);
    }
  };

  // --- FETCH TRENDS ---
  const fetchTrends = async () => {
    if (!trendStart || !trendEnd) {
      toast({
        title: "Preencha as datas para os trends.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setLoadingTrends(true);
    try {
      const response = await axios.get<TrendData[]>(
        `${API_URL}/action_trends`,
        {
          params: {
            start_time: new Date(trendStart).toISOString(),
            end_time: new Date(trendEnd).toISOString(),
          },
        },
      );
      setTrendsData(response.data);
    } catch (error) {
      toast({
        title: "Erro ao buscar trends.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingTrends(false);
    }
  };

  // --- CONFIGURAÇÃO DO CHART.JS ---

  // 1. Opções (Eixos, Legendas, Responsividade)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Permite que o gráfico preencha a altura do Box pai
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Action Frequency by User Pair",
      },
    },
    scales: {
      y: {
        beginAtZero: true, // Garante que a barra comece do 0
        ticks: {
          stepSize: 1, // Evita decimais se a contagem for pequena (1, 2, 3...)
        },
      },
    },
  };

  // 2. Dados Formatados
  const chartData = {
    // Labels no Eixo X (User + Action)
    labels: trendsData.map((d) => `User ${d.user_id}: ${d.action}`),
    datasets: [
      {
        label: "Occurrences",
        data: trendsData.map((d) => d.count),
        // Cores alternadas (Roxo e Teal) para ficar bonito
        backgroundColor: trendsData.map((_, index) =>
          index % 2 === 0
            ? "rgba(128, 90, 213, 0.7)"
            : "rgba(49, 151, 149, 0.7)",
        ),
        borderColor: trendsData.map((_, index) =>
          index % 2 === 0 ? "rgba(128, 90, 213, 1)" : "rgba(49, 151, 149, 1)",
        ),
        borderWidth: 1,
      },
    ],
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={10} align="stretch">
        {/* === SEÇÃO 1: SUMMARY === */}
        <Box>
          <Heading size="lg" mb={4} color="teal.600">
            User Summary Analysis
          </Heading>

          <Card p={4} variant="outline" mb={6}>
            <Flex gap={4} wrap="wrap" align="end">
              <FormControl w={["100%", "150px"]}>
                <FormLabel>User ID</FormLabel>
                <Input
                  placeholder="Ex: 1"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </FormControl>

              <FormControl w={["100%", "200px"]}>
                <FormLabel>Start Time</FormLabel>
                <Input
                  type="datetime-local"
                  value={summaryStart}
                  onChange={(e) => setSummaryStart(e.target.value)}
                />
              </FormControl>

              <FormControl w={["100%", "200px"]}>
                <FormLabel>End Time</FormLabel>
                <Input
                  type="datetime-local"
                  value={summaryEnd}
                  onChange={(e) => setSummaryEnd(e.target.value)}
                />
              </FormControl>

              <Button
                colorScheme="teal"
                onClick={fetchSummary}
                isLoading={loadingSummary}
                w={["100%", "auto"]}
              >
                Analyze
              </Button>
            </Flex>
          </Card>

          {summaryData && (
            <SimpleGrid columns={[1, 2, 4]} spacing={5}>
              <SummaryCard
                label="Total Actions"
                value={summaryData.total_actions}
                helpText="Records found"
              />
              <SummaryCard
                label="Most Freq. Action"
                value={summaryData.most_frequent_action || "N/A"}
                helpText="Top activity"
              />
              <SummaryCard
                label="Avg Duration"
                value={`${summaryData.avg_duration}s`}
                helpText="Time on page"
              />
              <SummaryCard
                label="Most Freq. Page"
                value={summaryData.most_frequent_page || "N/A"}
                helpText="Top visited"
              />
            </SimpleGrid>
          )}
        </Box>

        <Divider />

        {/* === SEÇÃO 2: TRENDS (CHART.JS) === */}
        <Box>
          <Heading size="lg" mb={4} color="purple.600">
            Action Trends (Top 3)
          </Heading>

          <Card p={4} variant="outline" mb={6}>
            <Flex gap={4} wrap="wrap" align="end">
              <FormControl w={["100%", "200px"]}>
                <FormLabel>Start Time</FormLabel>
                <Input
                  type="datetime-local"
                  value={trendStart}
                  onChange={(e) => setTrendStart(e.target.value)}
                />
              </FormControl>

              <FormControl w={["100%", "200px"]}>
                <FormLabel>End Time</FormLabel>
                <Input
                  type="datetime-local"
                  value={trendEnd}
                  onChange={(e) => setTrendEnd(e.target.value)}
                />
              </FormControl>

              <Button
                colorScheme="purple"
                onClick={fetchTrends}
                isLoading={loadingTrends}
                w={["100%", "auto"]}
              >
                Get Trends
              </Button>
            </Flex>
          </Card>

          {/* Renderização Condicional do Gráfico */}
          {trendsData.length > 0 ? (
            <Box
              h="400px"
              w="100%"
              bg="white"
              p={4}
              borderRadius="md"
              borderWidth="1px"
              boxShadow="sm"
            >
              {/* Componente Bar do Chart.js */}
              <Bar options={chartOptions} data={chartData} />
            </Box>
          ) : (
            !loadingTrends && (
              <Text color="gray.500">No trend data to display.</Text>
            )
          )}
        </Box>
      </VStack>
    </Container>
  );
};

const SummaryCard = ({
  label,
  value,
  helpText,
}: {
  label: string;
  value: string | number;
  helpText: string;
}) => (
  <Card>
    <CardBody>
      <Stat>
        <StatLabel fontSize="md" color="gray.500">
          {label}
        </StatLabel>
        <StatNumber fontSize="2xl" fontWeight="bold">
          {value}
        </StatNumber>
        <StatHelpText>{helpText}</StatHelpText>
      </Stat>
    </CardBody>
  </Card>
);

export default Dashboard;
