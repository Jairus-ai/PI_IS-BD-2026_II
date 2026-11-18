import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DiscountProduct } from '../types/discounts';
import {
    addDiscount,
    editDiscount,
    deleteDiscount,
    getDiscounts,
    getDiscountsCount,
    getDiscountsByID,
    getDiscountProducts,
} from '../services/discountService';

export const useDiscounts = (
    page: number = 1,
    discountId: number | null | undefined = null,
    type: string | null | undefined = null,
    filters: any = {},
) => {
    const discountsQuery = useQuery({
        queryKey: ['discounts', page, filters],
        queryFn: () => getDiscounts(page, filters),
    });

    const countQuery = useQuery({
        queryKey: ['discountsCount', filters],
        queryFn: () => getDiscountsCount(filters),
    });

    const discountDetailQuery = useQuery({
        queryKey: ['discount', discountId],
        queryFn: () => getDiscountsByID(discountId),
        enabled: discountId != null,
    });

    const productsQuery = useQuery({
        queryKey: ['discountProducts', type],
        queryFn: () => getDiscountProducts(type),
        enabled: type != null,
    });

    const queryClient = useQueryClient();

    const createDiscountMutation = useMutation({
        mutationFn: ({ discount, type }: { discount: any; type: string }) => addDiscount(discount, type),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['discounts'] });
            await queryClient.invalidateQueries({ queryKey: ['discountsCount'] });
        },
    });

    const updateDiscountMutation = useMutation({
        mutationFn: ({ id, discount, type }: { id: number; discount: any; type: string }) =>
            editDiscount(id, discount, type),
        onSuccess: async (_data, variables) => {
            await queryClient.invalidateQueries({ queryKey: ['discounts'] });
            await queryClient.invalidateQueries({ queryKey: ['discount', variables.id] });
        },
    });

    const deleteDiscountMutation = useMutation({
        mutationFn: ({ id }: { id: number }) => deleteDiscount(id),
        onSuccess: async (_data, variables) => {
            queryClient.removeQueries({ queryKey: ['discount', variables.id] });
            await queryClient.invalidateQueries({ queryKey: ['discounts'] });
            await queryClient.invalidateQueries({ queryKey: ['discountsCount'] });
        },
    });

    return {
        discounts: discountsQuery.data?.data ?? [],
        totalDiscounts: countQuery.data?.total ?? 0,
        isLoadingDiscounts: discountsQuery.isLoading,
        discountsError: discountsQuery.error,

        discountDetail: discountDetailQuery.data?.data ?? null,
        isLoadingDetail: discountDetailQuery.isLoading,

        discountProducts: (Array.isArray(productsQuery.data) ? productsQuery.data : []) as DiscountProduct[],
        isLoadingProducts: productsQuery.isLoading,

        createDiscount: (discount: any, type: string) => createDiscountMutation.mutateAsync({ discount, type }),
        isCreatingDiscount: createDiscountMutation.isPending,
        createDiscountError: createDiscountMutation.error,

        updateDiscount: (id: number, discount: any, type: string) =>
            updateDiscountMutation.mutateAsync({ id, discount, type }),
        isUpdatingDiscount: updateDiscountMutation.isPending,

        deleteDiscount: (id: number) => deleteDiscountMutation.mutateAsync({ id }),
        isDeletingDiscount: deleteDiscountMutation.isPending,
        deleteDiscountError: deleteDiscountMutation.error,
    };
};